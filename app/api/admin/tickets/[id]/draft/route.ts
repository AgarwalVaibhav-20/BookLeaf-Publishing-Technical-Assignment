import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { generateDraftResponse } from "@/app/lib/ai/draftResponse";
import { sanitizeErrorMessage } from "@/app/lib/ai/retry";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const bearerToken = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearerToken ?? cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    const decoded = await verifyToken(token);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.email !== "string" ||
      typeof decoded.userId !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 },
      );
    }

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 },
      );
    }

    await dbConnect();
    const user = await UserModel.findOne({
      email: decoded.email.toLowerCase().trim(),
    }).select("email role");

    if (
      !user ||
      user._id.toString() !== decoded.userId ||
      user.role !== "admin"
    ) {
      return NextResponse.json(
        { success: false, message: "Account not found or access denied." },
        { status: 403 },
      );
    }

    let forceRegenerate = false;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && body.forceRegenerate === true) {
        forceRegenerate = true;
      }
    } catch {
      // Body may be empty on standard POST
    }

    const { id } = await params;

    const ticketQuery = mongoose.Types.ObjectId.isValid(id)
      ? {
          $or: [
            { _id: new mongoose.Types.ObjectId(id) },
            { ticket_id: id },
          ],
        }
      : { ticket_id: id };

    const ticket = await TicketModel.findOne(ticketQuery);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 },
      );
    }

    // Cost Optimization: If a draft is already cached and regeneration was not explicitly requested,
    // return cached draft without invoking the Gemini API.
    if (!forceRegenerate && ticket.ai_draft_response) {
      return NextResponse.json(
        {
          success: true,
          draft: ticket.ai_draft_response,
          cached: true,
          model: ticket.ai_model ?? "cached",
          tokens_used: ticket.ai_tokens_used ?? null,
        },
        { status: 200 },
      );
    }

    try {
      const result = await generateDraftResponse({
        ticket_id: ticket.ticket_id,
        subject: ticket.subject,
        message: ticket.message,
        author_name: ticket.author_name,
        category: ticket.category,
        priority: ticket.priority,
        conversation: (ticket.messages ?? []).map((m) => ({
          sender: m.sender,
          senderRole: m.senderRole,
          message: m.message,
        })),
      });

      // Save generated response to database so subsequent page views do not trigger Gemini
      await TicketModel.updateOne(
        { _id: ticket._id },
        {
          $set: {
            ai_draft_response: result.draft,
            ai_model: result.model,
            ai_tokens_used: result.tokens_used ?? null,
          },
        },
      );

      return NextResponse.json(
        {
          success: true,
          draft: result.draft,
          cached: false,
          model: result.model,
          tokens_used: result.tokens_used,
        },
        { status: 200 },
      );
    } catch (aiError) {
      const safeMsg = sanitizeErrorMessage(
        aiError instanceof Error ? aiError.message : "AI drafting failed",
      );
      console.error("AI response drafting failed gracefully:", safeMsg);

      return NextResponse.json(
        {
          success: false,
          message:
            "AI response generator is currently unavailable. Please compose your reply manually.",
        },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("POST /api/admin/tickets/[id]/draft error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An internal server error occurred while processing draft request.",
      },
      { status: 500 },
    );
  }
}
