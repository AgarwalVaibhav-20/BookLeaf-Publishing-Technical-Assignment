import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { AuthorModel } from "@/app/model/Author";

const updateBookSchema = z.object({
  author_id: z.string().trim().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Book title is required.")
    .max(200)
    .optional(),
  isbn: z.string().trim().optional(),
  genre: z.string().trim().min(1, "Genre is required.").optional(),
  publication_date: z.string().trim().nullable().optional(),
  status: z.string().trim().min(1).optional(),
  mrp: z.number().nonnegative().nullable().optional(),
  author_royalty_per_copy: z.number().nonnegative().nullable().optional(),
  total_copies_sold: z.number().int().nonnegative().optional(),
  total_royalty_earned: z.number().nonnegative().optional(),
  royalty_paid: z.number().nonnegative().optional(),
  royalty_pending: z.number().nonnegative().optional(),
  last_royalty_payout_date: z.string().trim().nullable().optional(),
  print_partner: z.string().trim().nullable().optional(),
  available_on: z.array(z.string().trim()).optional(),
});

async function authenticateAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const bearerToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = cookieStore.get("token")?.value || bearerToken;

  if (!token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const decoded = await verifyToken(token);
  if (typeof decoded !== "object" || decoded === null) {
    return { error: "Invalid or expired token.", status: 401 as const };
  }

  if (decoded.role !== "admin") {
    return { error: "Admin access required.", status: 403 as const };
  }

  return { decoded };
}

// GET /api/books/[id] - Get single book details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status },
      );
    }

    const { id } = await params;
    await dbConnect();

    const author = await AuthorModel.findOne({ "books.book_id": id }).lean();
    if (!author) {
      return NextResponse.json(
        { success: false, message: "Book not found." },
        { status: 404 },
      );
    }

    const book = author.books.find((b) => b.book_id === id);
    if (!book) {
      return NextResponse.json(
        { success: false, message: "Book not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        book: {
          ...book,
          author_id: author.author_id,
          author_name: author.name,
          author_email: author.email,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/books/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch book." },
      { status: 500 },
    );
  }
}

// PATCH /api/books/[id] - Update book details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status },
      );
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parsed = updateBookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find the author holding this book currently
    const currentAuthor = await AuthorModel.findOne({ "books.book_id": id });
    if (!currentAuthor) {
      return NextResponse.json(
        { success: false, message: "Book not found." },
        { status: 404 },
      );
    }

    const bookIndex = currentAuthor.books.findIndex((b) => b.book_id === id);
    if (bookIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Book not found on author profile." },
        { status: 404 },
      );
    }

    const existingBook = currentAuthor.books[bookIndex];

    const updatedCopies =
      parsed.data.total_copies_sold !== undefined
        ? parsed.data.total_copies_sold
        : (existingBook.total_copies_sold ?? 0);
    const updatedRoyaltyPerCopy =
      parsed.data.author_royalty_per_copy !== undefined
        ? parsed.data.author_royalty_per_copy
        : (existingBook.author_royalty_per_copy ?? 0);
    const updatedEarned =
      parsed.data.total_royalty_earned !== undefined
        ? parsed.data.total_royalty_earned
        : parsed.data.author_royalty_per_copy !== undefined ||
            parsed.data.total_copies_sold !== undefined
          ? Math.round((updatedRoyaltyPerCopy ?? 0) * updatedCopies * 100) / 100
          : existingBook.total_royalty_earned;
    const updatedPaid =
      parsed.data.royalty_paid !== undefined
        ? parsed.data.royalty_paid
        : (existingBook.royalty_paid ?? 0);
    const updatedPending =
      parsed.data.royalty_pending !== undefined
        ? parsed.data.royalty_pending
        : Math.max(
            0,
            Math.round(((updatedEarned ?? 0) - updatedPaid) * 100) / 100,
          );

    // Merge updated book data
    const updatedBook = {
      book_id: existingBook.book_id,
      title: parsed.data.title ?? existingBook.title,
      isbn: parsed.data.isbn ?? existingBook.isbn,
      genre: parsed.data.genre ?? existingBook.genre,
      publication_date:
        parsed.data.publication_date !== undefined
          ? parsed.data.publication_date
          : existingBook.publication_date,
      status: parsed.data.status ?? existingBook.status,
      mrp: parsed.data.mrp !== undefined ? parsed.data.mrp : existingBook.mrp,
      author_royalty_per_copy: updatedRoyaltyPerCopy,
      total_copies_sold: updatedCopies,
      total_royalty_earned: updatedEarned,
      royalty_paid: updatedPaid,
      royalty_pending: updatedPending,
      last_royalty_payout_date:
        parsed.data.last_royalty_payout_date !== undefined
          ? parsed.data.last_royalty_payout_date
          : existingBook.last_royalty_payout_date,
      print_partner:
        parsed.data.print_partner !== undefined
          ? parsed.data.print_partner
          : existingBook.print_partner,
      available_on:
        parsed.data.available_on !== undefined
          ? parsed.data.available_on
          : existingBook.available_on,
    };

    // If author was changed
    if (
      parsed.data.author_id &&
      parsed.data.author_id !== currentAuthor.author_id
    ) {
      const targetAuthor = await AuthorModel.findOne({
        author_id: parsed.data.author_id,
      });

      if (!targetAuthor) {
        return NextResponse.json(
          { success: false, message: "Target author not found." },
          { status: 404 },
        );
      }

      // Remove from current author
      currentAuthor.books.splice(bookIndex, 1);
      await currentAuthor.save();

      // Add to new author
      targetAuthor.books.push(updatedBook);
      await targetAuthor.save();

      return NextResponse.json(
        {
          success: true,
          message: "Book reassigned and updated successfully.",
          book: {
            ...updatedBook,
            author_id: targetAuthor.author_id,
            author_name: targetAuthor.name,
            author_email: targetAuthor.email,
          },
        },
        { status: 200 },
      );
    }

    // Otherwise update in-place
    currentAuthor.books[bookIndex] = updatedBook;
    await currentAuthor.save();

    return NextResponse.json(
      {
        success: true,
        message: "Book updated successfully.",
        book: {
          ...updatedBook,
          author_id: currentAuthor.author_id,
          author_name: currentAuthor.name,
          author_email: currentAuthor.email,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH /api/books/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update book." },
      { status: 500 },
    );
  }
}

// DELETE /api/books/[id] - Delete a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status },
      );
    }

    const { id } = await params;
    await dbConnect();

    const author = await AuthorModel.findOne({ "books.book_id": id });
    if (!author) {
      return NextResponse.json(
        { success: false, message: "Book not found." },
        { status: 404 },
      );
    }

    author.books = author.books.filter((b) => b.book_id !== id);
    await author.save();

    return NextResponse.json(
      { success: true, message: "Book deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/books/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete book." },
      { status: 500 },
    );
  }
}
