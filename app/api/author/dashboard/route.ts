import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/app/lib/dbConnect";
import { verifyToken } from "@/app/lib/jwt";
import { AuthorModel } from "@/app/model/Author";
import { TicketModel } from "@/app/model/Ticket";
import { UserModel } from "@/app/model/User";

function getInitials(name: string): string {
  if (!name) return "AU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

    if (decoded.role !== "author") {
      return NextResponse.json(
        { success: false, message: "Author access required." },
        { status: 403 },
      );
    }

    await dbConnect();

    const user = await UserModel.findById(decoded.userId).select(
      "name email role author_id",
    );

    if (!user || (user.role !== "author" && user.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "Author account not found." },
        { status: 404 },
      );
    }

    // 1. Lookup Author Profile by author_id if linked
    let author = null;
    if (user.author_id) {
      author = await AuthorModel.findOne({ author_id: user.author_id }).lean();
    }

    // 2. Lookup Author Profile by email
    if (!author) {
      author = await AuthorModel.findOne({
        email: user.email.toLowerCase().trim(),
      }).lean();
    }

    // 3. If not found by email, try matching by name
    if (!author && user.name) {
      author = await AuthorModel.findOne({
        name: new RegExp(`^${user.name.trim()}$`, "i"),
      }).lean();
    }

    // 4. If author document does not exist yet, create one for this user
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

    const books = author?.books ?? [];

    const totalBooks = books.length;
    const copiesSold = books.reduce(
      (sum, b) => sum + (b.total_copies_sold || 0),
      0,
    );
    const royaltyEarned = books.reduce(
      (sum, b) => sum + (b.total_royalty_earned || 0),
      0,
    );
    const royaltyPaid = books.reduce(
      (sum, b) => sum + (b.royalty_paid || 0),
      0,
    );
    const royaltyPending = books.reduce(
      (sum, b) => sum + (b.royalty_pending || 0),
      0,
    );
    const paidPercentage =
      royaltyEarned > 0 ? (royaltyPaid / royaltyEarned) * 100 : 0;

    // Fetch real recent tickets for this author
    const queryConditions: Record<string, unknown>[] = [
      { author_email: user.email },
      { author_id: user._id.toString() },
    ];
    if (author?.author_id) {
      queryConditions.push({ author_id: author.author_id });
    }

    const rawTickets = await TicketModel.find({ $or: queryConditions })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id ticket_id subject status createdAt category")
      .lean();

    const tickets = rawTickets.map((t) => ({
      id: t.ticket_id || `TKT-${t._id.toString().slice(-6).toUpperCase()}`,
      dbId: t._id.toString(),
      subject: t.subject,
      status: t.status,
      category: t.category,
      date: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Recent",
    }));

    return NextResponse.json(
      {
        success: true,
        author: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          author_id: author.author_id,
          initials: getInitials(user.name),
        },
        stats: {
          totalBooks,
          copiesSold,
          royaltyEarned,
          royaltyPaid,
          royaltyPending,
          paidPercentage,
        },
        books: books.map((b) => ({
          id: b.book_id,
          title: b.title,
          genre: b.genre,
          status: b.status,
          sold: b.total_copies_sold,
          royalty: b.total_royalty_earned,
        })),
        tickets,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/author/dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load author dashboard data." },
      { status: 500 },
    );
  }
}
