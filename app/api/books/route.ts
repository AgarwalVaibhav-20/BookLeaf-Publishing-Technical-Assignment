import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { AuthorModel } from "@/app/model/Author";

const createBookSchema = z.object({
  author_id: z.string().trim().min(1, "Author selection is required."),
  title: z.string().trim().min(1, "Book title is required.").max(200),
  isbn: z.string().trim().default("Pending"),
  genre: z.string().trim().min(1, "Genre is required."),
  publication_date: z.string().trim().nullable().optional(),
  status: z.string().trim().min(1).default("In Production"),
  mrp: z.number().nonnegative().nullable().optional().default(0),
  author_royalty_per_copy: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .default(0),
  total_copies_sold: z
    .number()
    .int()
    .nonnegative()
    .default(0),
  total_royalty_earned: z
    .number()
    .nonnegative()
    .default(0),
  royalty_paid: z
    .number()
    .nonnegative()
    .default(0),
  royalty_pending: z
    .number()
    .nonnegative()
    .default(0),
  last_royalty_payout_date: z.string().trim().nullable().optional(),
  print_partner: z.string().trim().nullable().optional(),
  available_on: z.array(z.string().trim()).default([]),
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

// GET /api/books - Fetch all books across all authors
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    await dbConnect();
    const authors = await AuthorModel.find({})
      .select("author_id name email books")
      .lean();

    const books = authors.flatMap((author) =>
      (author.books ?? []).map((book) => ({
        ...book,
        author_id: author.author_id,
        author_name: author.name,
        author_email: author.email,
      }))
    );

    return NextResponse.json(
      {
        success: true,
        message: "Books fetched successfully.",
        total: books.length,
        books,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/books error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch books." },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book under an author
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const parsed = createBookSchema.safeParse(body);
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

    const author = await AuthorModel.findOne({
      author_id: parsed.data.author_id,
    });

    if (!author) {
      return NextResponse.json(
        { success: false, message: "Selected author was not found." },
        { status: 404 }
      );
    }

    // Generate unique Book ID
    const bookId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;

    const totalCopiesSold = parsed.data.total_copies_sold ?? 0;
    const royaltyPerCopy = parsed.data.author_royalty_per_copy ?? 0;
    const computedEarned = Math.round(royaltyPerCopy * totalCopiesSold * 100) / 100;
    const totalRoyaltyEarned =
      parsed.data.total_royalty_earned !== undefined && parsed.data.total_royalty_earned > 0
        ? parsed.data.total_royalty_earned
        : (computedEarned > 0 ? computedEarned : (parsed.data.total_royalty_earned ?? 0));

    const royaltyPaid = parsed.data.royalty_paid ?? 0;
    const computedPending = Math.max(0, Math.round((totalRoyaltyEarned - royaltyPaid) * 100) / 100);
    const royaltyPending =
      parsed.data.royalty_pending !== undefined && parsed.data.royalty_pending > 0
        ? parsed.data.royalty_pending
        : computedPending;

    const newBook = {
      book_id: bookId,
      title: parsed.data.title,
      isbn: parsed.data.isbn || "Pending",
      genre: parsed.data.genre,
      publication_date: parsed.data.publication_date || null,
      status: parsed.data.status || "In Production",
      mrp: parsed.data.mrp ?? 0,
      author_royalty_per_copy: royaltyPerCopy,
      total_copies_sold: totalCopiesSold,
      total_royalty_earned: totalRoyaltyEarned,
      royalty_paid: royaltyPaid,
      royalty_pending: royaltyPending,
      last_royalty_payout_date: parsed.data.last_royalty_payout_date || null,
      print_partner: parsed.data.print_partner || null,
      available_on: parsed.data.available_on || [],
    };

    author.books.push(newBook);
    await author.save();

    return NextResponse.json(
      {
        success: true,
        message: "Book created successfully.",
        book: {
          ...newBook,
          author_id: author.author_id,
          author_name: author.name,
          author_email: author.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/books error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create book." },
      { status: 500 }
    );
  }
}