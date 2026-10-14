import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

import { TICKET_CATEGORIES } from "@/app/model/Ticket";

const updateTicketSchema = z.object({
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
  assigned_to: z.string().trim().nullable().optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(),
});

export async function PATCH(
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
    }).select("name email role");

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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid update fields." },
        { status: 400 },
      );
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

    const updateFields: Record<string, any> = {};
    if (parsed.data.status) {
      updateFields.status = parsed.data.status;
    }
    if (parsed.data.assigned_to !== undefined) {
      updateFields.assigned_to = parsed.data.assigned_to || "Unassigned";
    }
    if (parsed.data.category) {
      updateFields.category = parsed.data.category;
    }
    if (parsed.data.priority) {
      updateFields.priority = parsed.data.priority;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided to update." },
        { status: 400 },
      );
    }

    const ticket = await TicketModel.findOneAndUpdate(
      ticketQuery,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Ticket updated successfully.",
        ticket,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/admin/tickets/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update ticket." },
      { status: 500 },
    );
  }
}
