import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

export async function GET(
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

    if (decoded.role !== "author" && decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Support access required." },
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
      user.role !== decoded.role
    ) {
      return NextResponse.json(
        { success: false, message: "Account not found or access denied." },
        { status: 404 },
      );
    }

    const { id } = await params;
    const ticket = await TicketModel.findOne({
      ...(user.role === "author" ? { author_email: user.email } : {}),
      ...(mongoose.Types.ObjectId.isValid(id)
        ? {
            $or: [{ ticket_id: id }, { _id: new mongoose.Types.ObjectId(id) }],
          }
        : { ticket_id: id }),
    }).lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 },
      );
    }

    const sanitizedTicket = { ...ticket, messages: ticket.messages ?? [] };
    if (user.role !== "admin") {
      delete (sanitizedTicket as any).internal_notes;
    }

    return NextResponse.json(
      {
        success: true,
        ticket: sanitizedTicket,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/tickets/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load this ticket." },
      { status: 500 },
    );
  }
}
