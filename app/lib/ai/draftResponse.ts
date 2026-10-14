import { GoogleGenAI } from "@google/genai";
import { getRelevantKnowledgeBase } from "./knowledgeBase";
import { executeWithRetry } from "./retry";

export interface TicketContext {
  ticket_id: string;
  subject: string;
  message: string;
  author_name: string;
  category?: string | null;
  priority?: string | null;
  book_title?: string | null;
  conversation?: Array<{ sender: string; senderRole: string; message: string }>;
}

export interface DraftResponseResult {
  draft: string;
  model: string;
  tokens_used?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function generateDraftResponse(
  context: TicketContext,
): Promise<DraftResponseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in server environment variables.",
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  // Token optimization:
  // 1. Send only the targeted policy section for this category, not the full knowledge base
  const targetedKnowledgeBase = getRelevantKnowledgeBase(context.category);

  // 2. Sliding window: Keep only the 5 most recent messages
  const recentMessages = (context.conversation ?? []).slice(-5);

  // 3. Truncate individual long messages to prevent prompt explosion
  const conversationHistory =
    recentMessages.length > 0
      ? recentMessages
          .map((m) => {
            const truncated =
              m.message.length > 500
                ? `${m.message.slice(0, 500)}... [truncated for context]`
                : m.message;
            return `${m.senderRole === "Admin" ? "Support Agent" : "Author"}: ${truncated}`;
          })
          .join("\n\n")
      : "No previous replies.";

  const cleanSubject = (context.subject || "").slice(0, 150).trim();
  const cleanOriginalMessage = (context.message || "").slice(0, 1500).trim();

  const prompt = `
You are an empathetic, knowledgeable, and professional customer support representative at BookLeaf Publishing.
Your task is to draft a helpful, professional, and clear reply to author "${context.author_name}" who submitted a support query.

========================
TARGETED POLICY CONTEXT:
========================
${targetedKnowledgeBase}

========================
TICKET DETAILS:
========================
- Ticket ID: ${context.ticket_id}
- Author Name: ${context.author_name}
- Category: ${context.category || "General Inquiry"}
- Priority: ${context.priority || "Medium"}
- Subject: ${cleanSubject}
- Original Query:
${cleanOriginalMessage}

Recent Conversation History:
${conversationHistory}

========================
INSTRUCTIONS:
========================
1. Address the author politely by their name ("Dear ${context.author_name}," or "Hello ${context.author_name},").
2. Be empathetic and professional. Acknowledge their concern directly before proposing next steps.
3. Follow the BookLeaf policy timelines from the context above (e.g. 80/20 royalty split, 45-day cycle, ₹1,000 threshold, 48h ISBN resolution, free reprint within 5-7 days after photo proof, 24-48h stock sync).
4. Never invent specific unverified payment dates or promises unsupported by the data.
5. If escalation is required, give a clear timeline ("Our team will look into this and update you within 48 hours").
6. Never use placeholder brackets like "[Your Name]". Sign off warmly as "BookLeaf Support Team".
7. Keep formatting clean, readable, and concise.

Draft your complete response directly below:
`;

  return await executeWithRetry(
    async () => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 600,
          temperature: 0.3,
        },
      });

      const draftText = (response.text ?? "").trim();
      if (!draftText) {
        throw new Error("Gemini returned an empty response draft.");
      }

      const usage = response.usageMetadata;
      const tokens_used = usage
        ? {
            prompt_tokens: usage.promptTokenCount,
            completion_tokens: usage.candidatesTokenCount,
            total_tokens: usage.totalTokenCount,
          }
        : undefined;

      return {
        draft: draftText,
        model,
        tokens_used,
      };
    },
    { operationName: "generateDraftResponse", maxRetries: 2 },
  );
}
