import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import dbConnect from "@/app/lib/dbConnect";
import { AuthorModel } from "@/app/model/Author";
import { authorSchema } from "@/app/schemas/authorSchem";
import { verifyToken } from "@/app/lib/jwt";


// Allow updates only to editable author fields.
const updateAuthorSchema = authorSchema
  .pick({
    name: true,
    email: true,
    phone: true,
    city: true,
    books: true,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

// Shared admin authentication
async function authenticateAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await verifyToken(token);

    if (!decoded || typeof decoded !== "object" || decoded.role !== "admin") {
      return {
        error: NextResponse.json(
          { success: false, message: "Admin access required" },
          { status: 403 }
        ),
      };
    }

    return { error: null };
  } catch {
    return {
      error: NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}

// GET /api/authors/[id]
// Fetch one author using the custom author_id.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin();

    if (auth.error) return auth.error;

    const { id } = await params;

    await dbConnect();

    const author = await AuthorModel.findOne({
      author_id: id,
    }).lean();

    if (!author) {
      return NextResponse.json(
        { success: false, message: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Author fetched successfully",
        author,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch author error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch author" },
      { status: 500 }
    );
  }
}

// PATCH /api/authors/[id]
// Update selected author fields.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin();

    if (auth.error) return auth.error;

    const { id } = await params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = updateAuthorSchema.safeParse(body);

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

    await dbConnect();

    // Avoid duplicate emails when updating an author.
    if (parsed.data.email) {
      const existingAuthor = await AuthorModel.findOne({
        email: parsed.data.email,
        author_id: { $ne: id },
      }).lean();

      if (existingAuthor) {
        return NextResponse.json(
          { success: false, message: "Email already belongs to another author" },
          { status: 409 }
        );
      }
    }

    const author = await AuthorModel.findOneAndUpdate(
      { author_id: id },
      { $set: parsed.data },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!author) {
      return NextResponse.json(
        { success: false, message: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Author updated successfully",
        author,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update author error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "Email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update author" },
      { status: 500 }
    );
  }
}

// DELETE /api/authors/[id]
// Permanently delete one author.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin();

    if (auth.error) return auth.error;

    const { id } = await params;

    await dbConnect();

    const author = await AuthorModel.findOneAndDelete({
      author_id: id,
    });

    if (!author) {
      return NextResponse.json(
        { success: false, message: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Author deleted successfully",
        author_id: id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete author error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete author" },
      { status: 500 }
    );
  }
}