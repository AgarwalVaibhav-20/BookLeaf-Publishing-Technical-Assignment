/**
 * BookLeaf AI Resiliency & Retry Utility
 *
 * Implements bounded exponential backoff with jitter for transient errors.
 * Strictly avoids retrying permanent errors (400, 401, 403, 404).
 * Sanitizes errors to ensure API keys and internal stack traces are never exposed.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  operationName?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  initialDelayMs: 600,
  maxDelayMs: 3000,
  backoffFactor: 2,
  operationName: "AI operation",
};

/**
 * Determines whether an error is transient/retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
  };

  const status = err.status ?? err.statusCode;
  const message = (err.message ?? "").toLowerCase();

  // Permanent client errors - NEVER retry
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }
  if (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid argument")
  ) {
    return false;
  }

  // Rate limiting (429) & Server Errors (500, 502, 503, 504) - Retryable
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  // Network or deadline failures
  if (
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("unavailable") ||
    message.includes("deadline_exceeded") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("fetch failed") ||
    message.includes("network error")
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts Retry-After delay in milliseconds if provided by the error.
 */
export function extractRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const err = error as {
    headers?: Record<string, string> | Headers;
    response?: { headers?: Record<string, string> | Headers };
    retryAfter?: number;
  };

  if (typeof err.retryAfter === "number" && err.retryAfter > 0) {
    return err.retryAfter * 1000;
  }

  const rawHeaders = err.headers ?? err.response?.headers;
  if (!rawHeaders) return null;

  let retryAfterHeader: string | null = null;
  if (typeof (rawHeaders as Headers).get === "function") {
    retryAfterHeader = (rawHeaders as Headers).get("retry-after");
  } else if (typeof rawHeaders === "object") {
    const dict = rawHeaders as Record<string, string>;
    retryAfterHeader = dict["retry-after"] ?? dict["Retry-After"] ?? null;
  }

  if (!retryAfterHeader) return null;

  const seconds = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 10000); // Bound to max 10s
  }

  return null;
}

/**
 * Strips API keys, bearer tokens, or internal credentials from error messages.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  let cleaned = rawMessage;

  const currentKey = process.env.GEMINI_API_KEY;
  if (currentKey && currentKey.length > 5) {
    cleaned = cleaned.replaceAll(currentKey, "[REDACTED_API_KEY]");
  }

  return cleaned
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
    .replace(/AQ\.[0-9A-Za-z-_]{30,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/[a-zA-Z0-9_-]{20,}:[a-zA-Z0-9_-]{20,}/g, "[REDACTED_SECRET]");
}

/**
 * Executes an async task with bounded exponential backoff and jitter.
 */
export async function executeWithRetry<T>(
  task: () => Promise<T>,
  customOptions?: RetryOptions,
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt === options.maxRetries || !isRetryableError(error)) {
        break;
      }

      // Respect Retry-After header or calculate exponential backoff with jitter
      const retryAfterMs = extractRetryAfterMs(error);
      const computedDelay =
        options.initialDelayMs * Math.pow(options.backoffFactor, attempt) +
        Math.floor(Math.random() * 200); // 0-200ms jitter

      const delayMs = Math.min(
        retryAfterMs ?? computedDelay,
        options.maxDelayMs,
      );

      console.warn(
        `[${options.operationName}] Transient failure on attempt ${attempt + 1}/${options.maxRetries + 1}. Retrying in ${delayMs}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const rawMsg =
    lastError instanceof Error ? lastError.message : "Unknown AI error";
  const safeMessage = sanitizeErrorMessage(rawMsg);

  throw new Error(`[${options.operationName}] Failed: ${safeMessage}`);
}
