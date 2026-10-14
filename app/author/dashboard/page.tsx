"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  IndianRupee,
  Wallet,
  MessageCircle,
  Plus,
  ChevronRight,
  Search,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

interface AuthorProfile {
  id: string;
  name: string;
  email: string;
  author_id?: string;
  initials: string;
}

interface DashboardStats {
  totalBooks: number;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  paidPercentage: number;
}

interface DashboardBook {
  id: string;
  title: string;
  genre: string;
  status: string;
  sold: number;
  royalty: number;
}

interface DashboardTicket {
  id: string;
  dbId: string;
  subject: string;
  status: string;
  category?: string;
  date: string;
}

interface DashboardData {
  author: AuthorProfile;
  stats: DashboardStats;
  books: DashboardBook[];
  tickets: DashboardTicket[];
}

const statusBadgeStyles: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AuthorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/author/dashboard", {
        credentials: "include",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          response.status === 404
            ? "Author dashboard service is not available."
            : "Received invalid response from server.",
        );
      }

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to load dashboard data.");
      }

      setData(resData);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadDashboardData();

    // Auto-refresh every 12 seconds so ticket responses and sales reflect in near real-time
    const interval = setInterval(() => {
      if (active) loadDashboardData();
    }, 12000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadDashboardData]);

  const authorName = data?.author?.name || "Author";
  const authorInitials = data?.author?.initials || "AU";
  const stats = data?.stats || {
    totalBooks: 0,
    copiesSold: 0,
    royaltyEarned: 0,
    royaltyPaid: 0,
    royaltyPending: 0,
    paidPercentage: 0,
  };
  const books = data?.books || [];
  const tickets = data?.tickets || [];

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const statCards = [
    {
      title: "Total Books",
      value: stats.totalBooks.toString(),
      subtitle: "In your catalogue",
      icon: BookOpen,
    },
    {
      title: "Copies Sold",
      value: stats.copiesSold.toLocaleString("en-IN"),
      subtitle: "Across your books",
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      title: "Royalty Earned",
      value: `₹${stats.royaltyEarned.toLocaleString("en-IN")}`,
      subtitle: "Lifetime earnings",
      icon: IndianRupee,
    },
    {
      title: "Royalty Pending",
      value: `₹${stats.royaltyPending.toLocaleString("en-IN")}`,
      subtitle: "Awaiting payout",
      icon: Wallet,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white text-[#303030]">
      {/* Desktop Top Header */}
      <header className="sticky top-0 z-20 hidden h-20 items-center justify-between border-b border-[#f0e7e8] bg-white/95 px-8 backdrop-blur lg:flex">
        <div>
          <p className="text-[11px] font-medium tracking-[1.5px] text-[#e76577]">
            BOOKLEAF PUBLISHING
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Author Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadDashboardData()}
            title="Refresh dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-[#e76577]"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>

          <NotificationBell />

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fde5e8] text-sm font-semibold text-[#dc5368] border border-rose-200/60 shadow-xs"
            title={`${authorName} (Author)`}
          >
            {authorInitials}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
        {/* Error notification if any */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-[#c94358]">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                loadDashboardData();
              }}
              className="font-semibold underline hover:text-[#a83446]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Welcome Section */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">
              {todayFormatted}
            </p>

            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {authorName}
              <span className="ml-2">👋</span>
            </h1>

            <p className="mt-1.5 max-w-xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
              Your stories deserve to be celebrated. Manage your books,
              track your earnings and get support whenever you need it.
            </p>
          </div>

          <Link
            href="/author/tickets/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f36678] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-[#df5266] w-full sm:w-auto"
          >
            <Plus size={18} />
            Submit a Query
          </Link>
        </section>

        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-[#fff0f1] p-6 sm:p-8 shadow-2xs">
          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[2px] text-[#df6374]">
              YOUR PUBLISHING JOURNEY
            </p>

            <h2 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl text-slate-900">
              Your books. Your voice.
              <br />
              Your success.
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
              Everything you need to follow your book performance and stay
              connected with the BookLeaf team.
            </p>

            <Link
              href="/author/books"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-[#df596d] hover:text-[#c94358] transition"
            >
              Explore your books
              <ChevronRight size={18} />
            </Link>
          </div>

          <div className="pointer-events-none absolute -right-10 -bottom-24 h-64 w-64 rounded-full bg-[#f9c9cf]/60 sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute top-6 right-16 hidden h-20 w-20 rounded-full border border-[#f4b4bd]/70 sm:block" />
        </section>

        {/* Statistics Cards */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Your publishing at a glance
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
              A live summary of your book performance and royalties.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-xl border border-[#f0e7e8] bg-white p-5 transition hover:border-[#f3bdc4] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">
                      {stat.title}
                    </p>

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f2] text-[#e75f72]">
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                  </div>

                  <h3 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    {loading && !data ? "—" : stat.value}
                  </h3>

                  <p className="mt-1.5 text-xs text-gray-400">
                    {stat.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Royalty summary and Support */}
        <section className="grid gap-5 xl:grid-cols-5">
          <div className="rounded-xl border border-[#f0e7e8] bg-white p-5 sm:p-6 xl:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Royalty Overview
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Your earnings and payout progress
                </p>
              </div>

              <div className="rounded-lg bg-[#fff0f2] p-2.5 text-[#e75f72]">
                <Wallet size={20} />
              </div>
            </div>

            <div className="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                <p className="text-xs font-medium text-gray-500">
                  Total royalty paid
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{stats.royaltyPaid.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Already paid to you
                </p>
              </div>

              <div className="rounded-xl bg-[#fff5f6] p-4 border border-[#fbdde1]">
                <p className="text-xs font-medium text-gray-500">
                  Pending royalty
                </p>
                <p className="mt-2 text-2xl font-bold text-[#e76577]">
                  ₹{stats.royaltyPending.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Awaiting payout
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-gray-500">Payout Progress</span>
                <span className="font-semibold text-slate-900">
                  {stats.paidPercentage.toFixed(1)}% paid
                </span>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-[#f9e6e8]"
                role="progressbar"
                aria-label="Royalty paid percentage"
                aria-valuenow={Math.round(stats.paidPercentage)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#f36678] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.paidPercentage))}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                Total lifetime royalties earned across your published books stand at{" "}
                <span className="font-semibold text-slate-800">
                  ₹{stats.royaltyEarned.toLocaleString("en-IN")}
                </span>
                . Refer to your Books tab for per-title performance.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#f36678] p-6 text-white xl:col-span-2 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <MessageCircle size={23} />
              </div>

              <h2 className="mt-5 text-xl font-bold">
                How can we help?
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/90">
                Have a question about your royalties, ISBN, printing quality
                or distribution? Our support team is ready to assist.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/author/tickets/new"
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#d94e63] transition hover:bg-[#fff5f6] shadow-sm"
              >
                Raise a support ticket
                <ChevronRight size={18} />
              </Link>

              <Link
                href="/author/tickets"
                className="flex items-center justify-between rounded-xl border border-white/40 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Track existing tickets
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Books */}
        <section className="overflow-hidden rounded-xl border border-[#f0e7e8] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#f3eded] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Books
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                Performance of your published titles
              </p>
            </div>

            <Link
              href="/author/books"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#e65e72] hover:text-[#ca4359]"
            >
              View all books
              <ChevronRight size={17} />
            </Link>
          </div>

          {books.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              <BookOpen size={30} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No books found</p>
              <p className="text-xs text-gray-400 mt-1">
                Your published book titles will appear here once registered.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#fffafa] text-xs text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Book title</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Copies sold</th>
                    <th className="px-6 py-4 font-medium">Royalty earned</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f4eeee]">
                  {books.map((book) => {
                    const isPublished = book.status === "Published & Live";

                    return (
                      <tr
                        key={book.id}
                        className="transition hover:bg-[#fffafa]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff0f2] text-[#e65e72]">
                              <BookOpen size={21} />
                            </div>

                            <div>
                              <p className="font-semibold text-gray-800">
                                {book.title}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {book.genre}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                              isPublished
                                ? "bg-[#eaf7ee] text-[#287b45]"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {book.status}
                          </span>
                        </td>

                        <td className="px-6 py-5 font-medium text-gray-800">
                          {book.sold.toLocaleString("en-IN")}
                        </td>

                        <td className="px-6 py-5 font-semibold text-[#e76577]">
                          ₹{book.royalty.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Tickets */}
        <section className="overflow-hidden rounded-xl border border-[#f0e7e8] bg-white">
          <div className="flex items-center justify-between border-b border-[#f3eded] p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Support Tickets
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                Stay up to date with your queries
              </p>
            </div>

            <Link
              href="/author/tickets"
              className="text-sm font-semibold text-[#e65e72] hover:text-[#ca4359]"
            >
              View all
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              <MessageCircle size={30} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No support tickets</p>
              <p className="text-xs text-gray-400 mt-1">
                You haven&apos;t created any queries yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#f4eeee]">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/author/tickets/${ticket.dbId || ticket.id}`}
                  className="flex flex-col justify-between gap-3 p-5 transition hover:bg-[#fffafa] sm:flex-row sm:items-center sm:px-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0f2] text-[#e65e72]">
                      <MessageCircle size={19} />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {ticket.id} · {ticket.date}
                        {ticket.category && ` · ${ticket.category}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                        statusBadgeStyles[ticket.status] ??
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {ticket.status}
                    </span>

                    <ChevronRight size={17} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-[#f3eded] p-4">
            <Link
              href="/author/tickets/new"
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#edc6cc] p-3 text-sm font-medium text-[#dc596d] transition hover:bg-[#fff5f6]"
            >
              <Plus size={17} />
              Create a new support query
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col justify-between gap-2 border-t border-[#f0e7e8] py-5 text-xs text-gray-400 sm:flex-row">
          <p>© {new Date().getFullYear()} BookLeaf Publishing. Author Portal.</p>

          <Link
            href="/author/tickets/new"
            className="hover:text-[#e65e72] transition"
          >
            Help & Support
          </Link>
        </footer>
      </div>
    </div>
  );
}
