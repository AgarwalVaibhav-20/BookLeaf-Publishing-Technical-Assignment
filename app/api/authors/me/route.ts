import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { AuthorModel } from "@/app/model/Author";
import { UserModel } from "@/app/model/User";

export async function GET(request: NextRequest) {
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

    if (typeof decoded !== "object" || decoded === null) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 },
      );
    }

    if (
      typeof decoded.email !== "string" ||
      !decoded.email.trim() ||
      typeof decoded.userId !== "string" ||
      !decoded.userId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Author account details missing from token.",
        },
        { status: 401 },
      );
    }

    await dbConnect();

    const user = await UserModel.findById(decoded.userId).select(
      "name email role author_id",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 },
      );
    }

    // 1. Check if user is linked by author_id
    let author = null;
    if (user.author_id) {
      author = await AuthorModel.findOne({ author_id: user.author_id }).lean();
    }

    // 2. Check if linked by email (case-insensitive)
    if (!author) {
      author = await AuthorModel.findOne({
        email: user.email.toLowerCase().trim(),
      }).lean();
    }

    // 3. Fallback: Check if linked by name
    if (!author && user.name) {
      author = await AuthorModel.findOne({
        name: new RegExp(`^${user.name.trim()}$`, "i"),
      }).lean();
    }

    // 4. If author profile doesn't exist yet, create one for this user
    if (!author) {
      const created = await AuthorModel.create({
        author_id: `AUTH-${user._id.toString().slice(-6).toUpperCase()}`,
        name: user.name || "Author",
        email: user.email.toLowerCase().trim(),
        phone: "+91-98765-43210",
        city: "Mumbai",
        joined_date: new Date().toISOString().split("T")[0],
        books: [],
      });
      author = created.toObject();
    }

    return NextResponse.json(
      {
        success: true,
        message: "Successfully fetched logged-in author data",
        author,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/authors/me error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch author data",
      },
      { status: 500 },
    );
  }
}