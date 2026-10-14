
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import dbConnect from "@/app/lib/dbConnect";
import { AuthorModel } from "@/app/model/Author";
import { verifyToken } from "@/app/lib/jwt";
import { authorSchema } from "@/app/schemas/authorSchem";

// GET /api/authors
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const bearerToken = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearerToken ?? cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (typeof decoded !== "object" || decoded === null) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only admins can view authors" },
        { status: 403 }
      );
    }

    await dbConnect();
    const authors = await AuthorModel.find().sort({ joined_date: -1 }).lean();

    return NextResponse.json(
      {
        success: true,
        authors,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Fetch authors error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch authors" },
      { status: 500 }
    );
  }
}

// POST /api/authors
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const bearerToken = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearerToken ?? cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Verify JWT
    const decoded = await verifyToken(token);

    if (typeof decoded !== "object" || decoded === null) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only admins can create authors" },
        { status: 403 }
      );
    }

    // 3. Read request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 4. Generate server-controlled fields
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, message: "Request body must be an object" },
        { status: 400 }
      );
    }

    const authorData = {
      ...body,
      author_id: `AUTH-${randomUUID().slice(0, 8).toUpperCase()}`,
      joined_date: new Date().toISOString().slice(0, 10),
      books: [],
    };

    // 5. Validate with your existing Zod schema
    const parsed = authorSchema.safeParse(authorData);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // 6. Connect to MongoDB
    await dbConnect();

    // 7. Check duplicate email
    const existingAuthor = await AuthorModel.findOne({
      email: parsed.data.email,
    }).lean();

    if (existingAuthor) {
      return NextResponse.json(
        { success: false, message: "Author email already exists" },
        { status: 409 }
      );
    }

    // 8. Create author
    const author = await AuthorModel.create(parsed.data);

    return NextResponse.json(
      {
        success: true,
        message: "Author created successfully",
        author,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create author error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Author email or ID already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create author" },
      { status: 500 }
    );
  }
}