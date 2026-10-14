import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { classifyTicket } from "@/app/lib/ai/classfyTicket";
import { sanitizeErrorMessage } from "@/app/lib/ai/retry";
import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { AuthorModel } from "@/app/model/Author";
import {
  TICKET_CATEGORIES,
  TicketModel,
  type TicketCategory,
  type TicketPriority,
} from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

const createTicketSchema = z.object({
  subject: z.string().trim().min(5).max(150),
  message: z.string().trim().min(20).max(5000),
  book_id: z.string().trim().nullable().optional(),
  bookId: z.string().trim().nullable().optional(),
  category: z.string().trim().min(1).max(100).optional(),
});

async function getAuthorFromRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const bearerToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearerToken ?? cookieStore.get("token")?.value;

  if (!token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const decoded = await verifyToken(token);

  if (typeof decoded !== "object" || decoded === null) {
    return { error: "Invalid or expired token.", status: 401 as const };
  }

  if (decoded.role !== "author") {
    return { error: "Author access required.", status: 403 as const };
  }

  if (
    typeof decoded.email !== "string" ||
    !decoded.email.trim() ||
    typeof decoded.userId !== "string" ||
    !decoded.userId.trim()
  ) {
    return {
      error: "Author account details are missing from the token.",
      status: 401 as const,
    };
  }

  await dbConnect();
  const user = await UserModel.findOne({
    email: decoded.email.toLowerCase().trim(),
  });

  if (
    !user ||
    user._id.toString() !== decoded.userId ||
    user.role !== "author"
  ) {
    return { error: "Author account not found.", status: 404 as const };
  }

  const profile = await AuthorModel.findOne({ email: user.email });
  const authorId = profile?.author_id ?? user._id.toString();

  return {
    author: {
      author_id: authorId,
      name: profile?.name ?? user.name,
      email: user.email,
      books: profile?.books ?? [],
      ticketAuthorIds: [authorId, user._id.toString()],
    },
  };
}

async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = await cookies();
  const bearerToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearerToken ?? cookieStore.get("token")?.value;

  if (!token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const decoded = await verifyToken(token);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.email !== "string" ||
    typeof decoded.userId !== "string"
  ) {
    return { error: "Invalid or expired token.", status: 401 as const };
  }

  if (decoded.role !== "author" && decoded.role !== "admin") {
    return { error: "Access denied.", status: 403 as const };
  }

  await dbConnect();
  const user = await UserModel.findOne({
    email: decoded.email.toLowerCase().trim(),
  });

  if (
    !user ||
    user._id.toString() !== decoded.userId ||
    user.role !== decoded.role
  ) {
    return {
      error: "Account not found or access denied.",
      status: 403 as const,
    };
  }

  return { user };
}

// GET /api/tickets
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);

    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status },
      );
    }

    const ticketQuery =
      auth.user.role === "admin" ? {} : { author_email: auth.user.email };
    const tickets = await TicketModel.find(ticketQuery)
      .select(auth.user.role === "admin" ? "" : "-internal_notes")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, tickets }, { status: 200 });
  } catch (error) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load your tickets." },
      { status: 500 },
    );
  }
}

// POST /api/tickets
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorFromRequest(request);

    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the ticket details.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const bookId = parsed.data.book_id ?? parsed.data.bookId ?? null;
    if (bookId && !auth.author.books.some((book) => book.book_id === bookId)) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected book does not belong to you.",
        },
        { status: 400 },
      );
    }

    let aiCategory: TicketCategory = "General Inquiry";
    let aiPriority: TicketPriority = "Medium";
    let aiConfidence: number | null = null;
    let aiReason: string | null = null;
    let aiTokensUsed: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    } | null = null;
    let aiModel: string | null = null;
    let aiError: string | null = null;
    let classificationStatus: "pending" | "completed" | "failed" = "pending";

    try {
      const result = await classifyTicket(
        parsed.data.subject,
        parsed.data.message,
      );

      aiCategory = result.category;
      aiPriority = result.priority;
      aiConfidence = result.confidence_score;
      aiReason = result.reason;
      aiTokensUsed = result.tokens_used ?? null;
      aiModel = result.model;
      classificationStatus = "completed";
    } catch (error) {
      const safeErrorMsg = sanitizeErrorMessage(
        error instanceof Error ? error.message : "AI classification failed",
      );
      console.error(
        "AI ticket classification failed gracefully:",
        safeErrorMsg,
      );
      classificationStatus = "failed";
      aiCategory = "General Inquiry";
      aiPriority = "Medium";
      aiConfidence = null;
      aiReason =
        "AI classification was unavailable at ticket creation. Default fallback applied.";
      aiError = safeErrorMsg;
    }

    const safeAiCategory: TicketCategory = (
      TICKET_CATEGORIES as readonly string[]
    ).includes(aiCategory)
      ? aiCategory
      : "General Inquiry";

    const safeCategory: TicketCategory =
      parsed.data.category &&
      (TICKET_CATEGORIES as readonly string[]).includes(parsed.data.category)
        ? (parsed.data.category as TicketCategory)
        : safeAiCategory;

    const safeAiPriority: TicketPriority = (
      ["Critical", "High", "Medium", "Low"] as const
    ).includes(aiPriority as any)
      ? aiPriority
      : "Medium";

    const safeAuthorName =
      (auth.author.name || "").trim() ||
      auth.author.email.split("@")[0] ||
      "Author";

    const safeAuthorId = auth.author.author_id || "AUTHOR";

    const ticket = await TicketModel.create({
      ticket_id: `TKT-${randomUUID().slice(0, 8).toUpperCase()}`,
      subject: parsed.data.subject,
      message: parsed.data.message,
      book_id: bookId,
      category: safeCategory,
      ai_category: safeAiCategory,
      ai_classification_status: classificationStatus,
      priority: safeAiPriority,
      ai_priority: safeAiPriority,
      ai_confidence_score: aiConfidence,
      ai_reason: aiReason,
      ai_tokens_used: aiTokensUsed,
      ai_model: aiModel,
      ai_error: aiError,
      author_id: safeAuthorId,
      author_name: safeAuthorName,
      author_email: auth.author.email,
    });

    // Notify the Socket.IO server so admins receive the real-time blinking light and title alert
    try {
      const socketUrl = `http://127.0.0.1:${process.env.SOCKET_PORT || "4001"}/internal/emit`;
      await fetch(socketUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret":
            process.env.SOCKET_INTERNAL_SECRET ||
            "replace_this_with_a_long_random_secret",
        },
        body: JSON.stringify({
          ticketMongoId: ticket._id.toString(),
          event: "message:new",
          data: {
            ticketId: ticket._id.toString(),
            ticket_id: ticket.ticket_id,
            message: {
              _id: ticket._id.toString(),
              sender: safeAuthorName,
              senderRole: "Author",
              message: ticket.message,
              createdAt: (ticket as any).createdAt || new Date(),
            },
          },
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (socketErr) {
      console.warn("Socket notification for new ticket failed:", socketErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Support query submitted successfully.",
        ticket,
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unable to submit your ticket.";
    console.error("POST /api/tickets error:", error);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 },
    );
  }
}
