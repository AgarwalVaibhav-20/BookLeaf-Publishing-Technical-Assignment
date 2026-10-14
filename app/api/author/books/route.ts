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

    if (decoded.role !== "author" && decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Author access required." },
        { status: 403 },
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
          message: "Author account details are missing from the token.",
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
        { success: false, message: "Author account not found." },
        { status: 404 },
      );
    }

    // 1. Try finding by author_id if linked
    let author = null;
    if (user.author_id) {
      author = await AuthorModel.findOne({ author_id: user.author_id })
        .select("author_id name email books")
        .lean();
    }

    // 2. Try finding by email (case-insensitive)
    if (!author) {
      author = await AuthorModel.findOne({
        email: user.email.toLowerCase().trim(),
      })
        .select("author_id name email books")
        .lean();
    }

    // 3. Try finding by author name
    if (!author && user.name) {
      author = await AuthorModel.findOne({
        name: new RegExp(`^${user.name.trim()}$`, "i"),
      })
        .select("author_id name email books")
        .lean();
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
        author: {
          id: user._id.toString(),
          author_id: author?.author_id,
          name: author?.name || user.name,
          email: author?.email || user.email,
        },
        books: author?.books ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/author/books error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load your books." },
      { status: 500 },
    );
  }
}
