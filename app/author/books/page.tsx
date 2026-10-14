"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  ArrowUpRight,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  X,
  CalendarDays,
  Hash,
  ChartNoAxesColumnIncreasing,
  Wallet,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export interface AuthorBookItem {
  id: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  copiesSold: number;
  royaltyPerCopy: number | null;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate?: string;
  printPartner: string;
  platforms: string[];
  cover: string;
  initials: string;
}

interface AuthorProfile {
  id?: string;
  author_id?: string;
  name: string;
  email: string;
  initials: string;
}

const coverGradients = [
  "from-rose-100 to-orange-50",
  "from-amber-100 to-yellow-50",
  "from-slate-200 to-blue-50",
  "from-emerald-100 to-teal-50",
  "from-violet-100 to-purple-50",
  "from-cyan-100 to-sky-50",
  "from-pink-100 to-rose-50",
  "from-lime-100 to-emerald-50",
];

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function getInitials(titleOrName: string): string {
  if (!titleOrName) return "BK";
  const parts = titleOrName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AuthorBooksPage() {
  const [books, setBooks] = useState<AuthorBookItem[]>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("title");
  const [selectedBook, setSelectedBook] = useState<AuthorBookItem | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/author/books", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Authentication required. Please log in."
            : "Failed to load author books.",
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load books.");
      }

      if (data.author) {
        const parts = (data.author.name || "Author").trim().split(/\s+/);
        const initials =
          parts.length === 1
            ? parts[0].slice(0, 2).toUpperCase()
            : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

        setAuthorProfile({
          id: data.author.id,
          author_id: data.author.author_id,
          name: data.author.name,
          email: data.author.email,
          initials,
        });
      }

      const rawBooks: any[] = Array.isArray(data.books) ? data.books : [];
      const mapped: AuthorBookItem[] = rawBooks.map((b, idx) => {
        const title = b.title || "Untitled Book";
        return {
          id: b.book_id || b.id || `BK${String(idx + 1).padStart(3, "0")}`,
          title,
          isbn: b.isbn || "—",
          genre: b.genre || "General",
          publicationDate: b.publication_date || b.publicationDate || null,
          status: b.status || "In Production",
          mrp: typeof b.mrp === "number" ? b.mrp : null,
          copiesSold: Number(b.total_copies_sold ?? b.copiesSold ?? 0),
          royaltyPerCopy:
            typeof (b.author_royalty_per_copy ?? b.royaltyPerCopy) === "number"
              ? Number(b.author_royalty_per_copy ?? b.royaltyPerCopy)
              : null,
          royaltyEarned: Number(
            b.total_royalty_earned ?? b.royaltyEarned ?? 0,
          ),
          royaltyPaid: Number(b.royalty_paid ?? b.royaltyPaid ?? 0),
          royaltyPending: Number(b.royalty_pending ?? b.royaltyPending ?? 0),
          lastRoyaltyPayoutDate:
            b.last_royalty_payout_date || b.lastRoyaltyPayoutDate || undefined,
          printPartner:
            b.print_partner || b.printPartner || "BookLeaf In-House",
          platforms: Array.isArray(b.available_on ?? b.platforms)
            ? (b.available_on ?? b.platforms)
            : [],
          cover: coverGradients[idx % coverGradients.length],
          initials: getInitials(title),
        };
      });

      setBooks(mapped);
    } catch (err: any) {
      console.error("Error loading books:", err);
      setError(err.message || "Failed to load author books.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        const query = search.toLowerCase().trim();

        const matchesSearch =
          book.title.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query) ||
          book.genre.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Published" &&
            book.status.toLowerCase().includes("published")) ||
          (statusFilter === "In Production" &&
            book.status.toLowerCase().includes("production"));

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "sales") return b.copiesSold - a.copiesSold;
        if (sortBy === "royalty") return b.royaltyEarned - a.royaltyEarned;
        return a.title.localeCompare(b.title);
      });
  }, [books, search, statusFilter, sortBy]);

  const totalCopies = useMemo(
    () => filteredBooks.reduce((sum, book) => sum + book.copiesSold, 0),
    [filteredBooks],
  );
  const totalEarned = useMemo(
    () => filteredBooks.reduce((sum, book) => sum + book.royaltyEarned, 0),
    [filteredBooks],
  );
  const totalPending = useMemo(
    () => filteredBooks.reduce((sum, book) => sum + book.royaltyPending, 0),
    [filteredBooks],
  );

  return (
    <div className="w-full min-h-screen bg-white text-[#303030]">
      {/* Desktop Header */}
      <header className="sticky top-0 z-20 hidden h-20 items-center justify-between border-b border-[#f0e7e8] bg-white/95 px-8 backdrop-blur lg:flex">
        <div>
          <p className="text-[11px] font-medium tracking-[1.5px] text-[#e76577]">
            BOOKLEAF PUBLISHING
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">My Books</h2>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fde5e8] text-sm font-semibold text-[#dc5368] border border-rose-200/60 shadow-xs"
            title={authorProfile?.name || "Author Account"}
          >
            {authorProfile?.initials || "AU"}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">
              Workspace / My Books
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Books
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
              {authorProfile?.name
                ? `Catalogue and publishing performance for ${authorProfile.name}.`
                : "Manage your published titles, monitor sales and review your royalty earnings in one place."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchBooks}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-rose-50/50 hover:text-[#e76577] disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin text-[#e76577]" : ""}
              />
              Refresh
            </button>

            <Link
              href="/author/tickets/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f36678] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-[#df5266]"
            >
              <Plus size={18} />
              Ask About a Book
            </Link>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-[#c83d53]">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchBooks}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#df596d] shadow-2xs hover:bg-rose-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Books Listed"
            value={loading ? "..." : filteredBooks.length.toString()}
            description="Matching your catalogue"
            icon={BookOpen}
          />
          <SummaryCard
            title="Copies Sold"
            value={loading ? "..." : totalCopies.toLocaleString("en-IN")}
            description="Across your listed books"
            icon={ChartNoAxesColumnIncreasing}
          />
          <SummaryCard
            title="Royalty Earned"
            value={loading ? "..." : formatINR(totalEarned)}
            description="Total earned by author"
            icon={IndianRupee}
          />
          <SummaryCard
            title="Royalty Pending"
            value={loading ? "..." : formatINR(totalPending)}
            description="Awaiting next payout"
            icon={Wallet}
          />
        </section>

        {/* Search and filters */}
        <section className="rounded-xl border border-[#f0e7e8] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, ISBN or genre..."
                className="w-full rounded-lg border border-[#eadfe1] py-3 pr-4 pl-10 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#f36678] focus:ring-2 focus:ring-[#f36678]/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter books by status"
                className="rounded-lg border border-[#eadfe1] bg-white px-4 py-3 text-sm outline-none focus:border-[#f36678]"
              >
                <option value="All">All statuses</option>
                <option value="Published">Published & Live</option>
                <option value="In Production">In Production</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort books"
                className="rounded-lg border border-[#eadfe1] bg-white px-4 py-3 text-sm outline-none focus:border-[#f36678]"
              >
                <option value="title">Sort: Title</option>
                <option value="sales">Sort: Best-selling</option>
                <option value="royalty">Sort: Highest royalty</option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            {loading
              ? "Loading your books catalogue..."
              : `Showing ${filteredBooks.length} of ${books.length} books in your catalogue`}
          </p>
        </section>

        {/* Book catalogue */}
        <section className="overflow-hidden rounded-xl border border-[#f0e7e8] bg-white">
          <div className="flex items-center justify-between border-b border-[#f3eded] p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Book Catalogue
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Your book details and publishing performance
              </p>
            </div>
            <BookOpen className="text-[#e76577]" size={23} />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 size={32} className="animate-spin text-[#e76577]" />
              <p className="mt-3 text-sm font-medium">Loading your book catalogue...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && books.length === 0 && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-[#e76577]">
                <BookOpen size={30} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">
                No books listed yet
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-gray-500">
                Your published or in-production books will appear here once registered under your author profile.
              </p>
              <Link
                href="/author/tickets/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f36678] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#df5266]"
              >
                <Plus size={16} /> Contact Support to Add Book
              </Link>
            </div>
          )}

          {/* Search No Results */}
          {!loading && books.length > 0 && filteredBooks.length === 0 && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <Search size={32} className="text-gray-300" />
              <h3 className="mt-4 font-semibold text-slate-800">
                No books match your criteria
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Try a different title, ISBN, genre or status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="mt-4 text-sm font-semibold text-[#df596d]"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Mobile Cards View (Visible on screens < md) */}
          {!loading && filteredBooks.length > 0 && (
            <div className="divide-y divide-[#f4eeee] md:hidden">
              {filteredBooks.map((book) => {
                const published = book.status.toLowerCase().includes("published");

                return (
                  <div
                    key={book.id}
                    className="p-4 sm:p-5 space-y-3.5 transition hover:bg-[#fffafa]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${book.cover} text-sm font-bold text-gray-700 shadow-sm`}
                      >
                        {book.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 leading-snug">
                          {book.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {book.genre} · {book.id}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              published
                                ? "bg-[#eaf7ee] text-[#287b45]"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {book.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metric pills in 2x2 grid */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#fff8f9] p-3 text-xs">
                      <div>
                        <span className="text-gray-500 text-[11px]">
                          Copies Sold
                        </span>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {book.copiesSold.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">MRP</span>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {book.mrp !== null ? formatINR(book.mrp) : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">
                          Royalty Earned
                        </span>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {formatINR(book.royaltyEarned)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">
                          Awaiting Payout
                        </span>
                        <p className="font-semibold text-[#df596d] mt-0.5">
                          {formatINR(book.royaltyPending)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">
                        {book.publicationDate
                          ? `Pub: ${book.publicationDate}`
                          : "Not published"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedBook(book)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#df596d] transition hover:bg-rose-50 shadow-2xs"
                      >
                        View Details
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop & Tablet Table (Visible on md: and up) */}
          {!loading && filteredBooks.length > 0 && (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#fffafa] text-xs text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Book</th>
                    <th className="px-5 py-4 font-medium">Publication</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">MRP</th>
                    <th className="px-5 py-4 font-medium">Copies Sold</th>
                    <th className="px-5 py-4 font-medium">Royalty Earned</th>
                    <th className="px-5 py-4 font-medium">Paid</th>
                    <th className="px-5 py-4 font-medium">Pending</th>
                    <th className="px-5 py-4 font-medium">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f4eeee]">
                  {filteredBooks.map((book) => {
                    const published = book.status
                      .toLowerCase()
                      .includes("published");

                    return (
                      <tr
                        key={book.id}
                        className="transition hover:bg-[#fffafa]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${book.cover} text-sm font-bold text-gray-700 shadow-sm`}
                            >
                              {book.initials}
                            </div>
                            <div className="max-w-[220px]">
                              <p className="font-semibold text-gray-800">
                                {book.title}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {book.genre}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-400">
                                {book.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {book.publicationDate ?? "Not published"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex max-w-[175px] rounded-full px-3 py-1.5 text-xs font-medium ${
                              published
                                ? "bg-[#eaf7ee] text-[#287b45]"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {book.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {book.mrp !== null ? formatINR(book.mrp) : "—"}
                        </td>

                        <td className="px-5 py-4">
                          {book.copiesSold.toLocaleString("en-IN")}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {formatINR(book.royaltyEarned)}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {formatINR(book.royaltyPaid)}
                        </td>

                        <td className="px-5 py-4 font-medium text-[#df596d]">
                          {formatINR(book.royaltyPending)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedBook(book)}
                            className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[#df596d] hover:text-[#bf3d52]"
                          >
                            View <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Book detail modal */}
        {selectedBook && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
            onClick={() => setSelectedBook(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="book-modal-title"
              className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${selectedBook.cover} text-lg font-bold text-gray-700`}
                  >
                    {selectedBook.initials}
                  </div>
                  <div>
                    <h2
                      id="book-modal-title"
                      className="text-xl font-semibold text-slate-900"
                    >
                      {selectedBook.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedBook.genre} · ID: {selectedBook.id}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-[#fff0f2] px-3 py-1 text-xs text-[#df596d] font-medium">
                      {selectedBook.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close book details"
                  onClick={() => setSelectedBook(null)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Detail icon={Hash} label="ISBN" value={selectedBook.isbn} />
                <Detail
                  icon={CalendarDays}
                  label="Publication date"
                  value={selectedBook.publicationDate ?? "Not published"}
                />
                <Detail
                  icon={IndianRupee}
                  label="Maximum retail price (MRP)"
                  value={
                    selectedBook.mrp !== null
                      ? formatINR(selectedBook.mrp)
                      : "Not available"
                  }
                />
                <Detail
                  icon={ShoppingBag}
                  label="Print partner"
                  value={selectedBook.printPartner ?? "Not assigned"}
                />
                <Detail
                  icon={ChartNoAxesColumnIncreasing}
                  label="Copies sold"
                  value={selectedBook.copiesSold.toLocaleString("en-IN")}
                />
                <Detail
                  icon={TrendingUp}
                  label="Royalty per copy"
                  value={
                    selectedBook.royaltyPerCopy !== null
                      ? formatINR(selectedBook.royaltyPerCopy)
                      : "Not available"
                  }
                />
              </div>

              <div className="mt-6 rounded-xl bg-[#fff5f6] p-5">
                <h3 className="font-semibold text-slate-800">
                  Royalty breakdown
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <MoneyRow
                    label="Total royalty earned"
                    value={formatINR(selectedBook.royaltyEarned)}
                  />
                  <MoneyRow
                    label="Royalty paid"
                    value={formatINR(selectedBook.royaltyPaid)}
                  />
                  <MoneyRow
                    label="Royalty pending"
                    value={formatINR(selectedBook.royaltyPending)}
                    highlight
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-slate-800">Available on</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedBook.platforms.length > 0 ? (
                    selectedBook.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-full border border-[#eedfe1] bg-slate-50/50 px-3 py-1.5 text-xs text-gray-700 font-medium"
                      >
                        {platform}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      Distribution has not started.
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/author/tickets/new"
                className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#f36678] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#df5266]"
              >
                Ask about this book
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        )}

        <footer className="flex flex-col justify-between gap-2 border-t border-[#f0e7e8] py-5 text-xs text-gray-400 sm:flex-row">
          <p>© 2026 BookLeaf Publishing. Author Portal.</p>
          <Link href="/author/tickets/new" className="hover:text-[#e65e72]">
            Help & Support
          </Link>
        </footer>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <div className="rounded-xl border border-[#f0e7e8] bg-white p-5 transition hover:border-[#f3bdc4] hover:shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f2] text-[#e75f72]">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#f0e7e8] p-4 bg-white">
      <div className="flex items-center gap-2 text-[#df596d]">
        <Icon size={17} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-600">{label}</span>
      <span
        className={
          highlight
            ? "font-semibold text-[#df596d]"
            : "font-semibold text-gray-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
