import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

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
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.email !== "string" ||
      typeof decoded.userId !== "string" ||
      !["author", "admin"].includes(decoded.role)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 },
      );
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
      return NextResponse.json(
        { success: false, message: "Account not found or access denied." },
        { status: 403 },
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

    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a message of up to 5000 characters.",
        },
        { status: 400 },
      );
    }

    const { id } = await params;

    const ticketQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { ticket_id: id }] }
      : { ticket_id: id };

    const ticket = await TicketModel.findOne(ticketQuery);

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 },
      );
    }

    if (
      user.role === "author" &&
      ticket.author_email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { success: false, message: "You cannot reply to this ticket." },
        { status: 403 },
      );
    }

    if (ticket.status === "Closed" || ticket.status === "Resolved") {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket is resolved or closed.",
        },
        { status: 400 },
      );
    }

    const savedMessage = {
      _id: new mongoose.Types.ObjectId(),
      sender:
        user.name ||
        (user.role === "admin" ? "BookLeaf Support" : ticket.author_name),
      senderRole:
        user.role === "admin" ? ("Admin" as const) : ("Author" as const),
      message: parsed.data.message,
      createdAt: new Date(),
    };

    const updateResult = await TicketModel.collection.updateOne(
      {
        _id: ticket._id,
        status: { $nin: ["Closed", "Resolved"] },
      },
      { $push: { messages: savedMessage } as any },
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket is resolved, closed, or no longer available.",
        },
        { status: 409 },
      );
    }

    // Notify the Socket.IO server after MongoDB successfully saves the message.
    // Socket outages must not turn a successfully saved message into an API failure.
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
              _id: savedMessage._id.toString(),
              sender: savedMessage.sender,
              senderRole: savedMessage.senderRole,
              message: savedMessage.message,
              createdAt: savedMessage.createdAt,
            },
          },
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (error) {
      console.error("Socket notification failed; message was saved:", error);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully.",
        ticketMessage: {
          _id: savedMessage._id.toString(),
          sender: savedMessage.sender,
          senderRole: savedMessage.senderRole,
          message: savedMessage.message,
          createdAt: savedMessage.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST ticket message error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to send your message." },
      { status: 500 },
    );
  }
}
