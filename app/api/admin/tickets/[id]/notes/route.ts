import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

const noteSchema = z.object({
  note: z.string().trim().min(1, "Note cannot be empty.").max(3000, "Note is too long."),
});

async function requireAdmin(request: NextRequest) {
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

  if (decoded.role !== "admin") {
    return { error: "Admin access required.", status: 403 as const };
  }

  await dbConnect();
  const user = await UserModel.findOne({
    email: decoded.email.toLowerCase().trim(),
  }).select("name email role");

  if (!user || user._id.toString() !== decoded.userId || user.role !== "admin") {
    return { error: "Account not found or access denied.", status: 403 as const };
  }

  return { user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const ticketQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { ticket_id: id }] }
      : { ticket_id: id };

    const ticket = await TicketModel.findOne(ticketQuery).select("internal_notes").lean();
    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      notes: ticket.internal_notes ?? [],
    });
  } catch (error) {
    console.error("GET /api/admin/tickets/[id]/notes error:", error);
    return NextResponse.json({ success: false, message: "Failed to load notes." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid note." },
        { status: 400 },
      );
    }

    const { id } = await params;
    const ticketQuery = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { ticket_id: id }] }
      : { ticket_id: id };

    const newNote = {
      _id: new mongoose.Types.ObjectId(),
      author: auth.user.name || "Admin",
      note: parsed.data.note,
      createdAt: new Date(),
    };

    const ticket = await TicketModel.findOneAndUpdate(
      ticketQuery,
      { $push: { internal_notes: newNote } },
      { new: true },
    );

    if (!ticket) {
      return NextResponse.json({ success: false, message: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Internal note added.",
        notes: ticket.internal_notes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/tickets/[id]/notes error:", error);
    return NextResponse.json({ success: false, message: "Failed to add note." }, { status: 500 });
  }
}
