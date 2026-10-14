import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Use /api/tickets/[id]/messages for message threads.",
  });
}
