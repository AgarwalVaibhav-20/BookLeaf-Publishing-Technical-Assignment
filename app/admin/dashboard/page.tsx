"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Headset,
  RefreshCw,
  Ticket,
  Users,
  ExternalLink,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Critical" | "High" | "Medium" | "Low";

interface RawTicket {
  _id: string;
  ticket_id?: string;
  subject: string;
  message?: string;
  author_name?: string;
  author_email?: string;
  category?: string;
  priority?: TicketPriority;
  ai_priority?: TicketPriority;
  ai_confidence_score?: number | null;
  status?: TicketStatus;
  assigned_to?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: Array<{
    sender?: string;
    senderRole?: string;
    message?: string;
    createdAt?: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Royalty & Payments": "bg-blue-500",
  "Payments & Royalties": "bg-blue-500",
  "ISBN & Metadata Issues": "bg-violet-500",
  "Printing & Quality": "bg-rose-500",
  "Distribution & Availability": "bg-amber-500",
  "Book Status & Production Updates": "bg-emerald-500",
  "Book Publishing": "bg-pink-500",
  "Account & Profile": "bg-orange-500",
  "General Inquiry": "bg-gray-400",
  Other: "bg-gray-400",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: "bg-blue-500",
  "In Progress": "bg-amber-500",
  Resolved: "bg-emerald-500",
  Closed: "bg-gray-400",
};

function Badge({
  children,
  type,
}: {
  children: React.ReactNode;
  type: string;
}) {
  const styles: Record<string, string> = {
    Critical: "bg-red-50 text-red-700 border border-red-200",
    High: "bg-orange-50 text-orange-700 border border-orange-200",
    Medium: "bg-amber-50 text-amber-700 border border-amber-200",
    Low: "bg-gray-100 text-gray-600 border border-gray-200",
    Open: "bg-blue-50 text-blue-700 border border-blue-200",
    "In Progress": "bg-amber-50 text-amber-700 border border-amber-200",
    Resolved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Closed: "bg-gray-100 text-gray-600 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[type] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<RawTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"all" | "30d" | "7d">("all");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load dashboard data");
      }
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to support database.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter tickets by selected period
  const filteredTickets = useMemo(() => {
    if (period === "all") return tickets;

    const now = Date.now();
    const days = period === "7d" ? 7 : 30;
    const threshold = now - days * 24 * 60 * 60 * 1000;

    return tickets.filter((t) => {
      const created = t.createdAt ? new Date(t.createdAt).getTime() : now;
      return created >= threshold;
    });
  }, [tickets, period]);

  // Computed summary metrics
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter((t) => t.status === "Open").length;
    const inProgress = filteredTickets.filter(
      (t) => t.status === "In Progress",
    ).length;
    const unresolved = open + inProgress;
    const criticalHigh = filteredTickets.filter(
      (t) => t.priority === "Critical" || t.priority === "High",
    ).length;
    const resolved = filteredTickets.filter(
      (t) => t.status === "Resolved" || t.status === "Closed",
    ).length;
    const resolutionRate =
      total > 0 ? ((resolved / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      unresolved,
      criticalHigh,
      resolved,
      resolutionRate,
      workload: unresolved,
    };
  }, [filteredTickets]);

  // Dynamic category distribution
  const categoriesData = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const t of filteredTickets) {
      const cat = t.category || "General Inquiry";
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const standardCategories = [
      "Royalty & Payments",
      "ISBN & Metadata Issues",
      "Printing & Quality",
      "Distribution & Availability",
      "Book Status & Production Updates",
      "General Inquiry",
    ];

    const list = standardCategories.map((name) => ({
      name,
      count: counts[name] || counts[name.replace(" & ", " and ")] || 0,
      color: CATEGORY_COLORS[name] || "bg-gray-400",
    }));

    // Add any unexpected category that may exist in DB
    Object.keys(counts).forEach((cat) => {
      if (!standardCategories.includes(cat)) {
        list.push({
          name: cat,
          count: counts[cat],
          color: CATEGORY_COLORS[cat] || "bg-gray-400",
        });
      }
    });

    return list.sort((a, b) => b.count - a.count);
  }, [filteredTickets]);

  const totalCategorized = useMemo(() => {
    return categoriesData.reduce((acc, curr) => acc + curr.count, 0);
  }, [categoriesData]);

  // Dynamic status distribution
  const statusData = useMemo(() => {
    const statuses: TicketStatus[] = [
      "Open",
      "In Progress",
      "Resolved",
      "Closed",
    ];
    return statuses.map((status) => ({
      name: status,
      count: filteredTickets.filter((t) => (t.status || "Open") === status)
        .length,
      color: STATUS_COLORS[status],
    }));
  }, [filteredTickets]);

  const totalStatusTickets = filteredTickets.length;

  // Recent tickets (latest 6)
  const recentTickets = useMemo(() => {
    return [...filteredTickets]
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);
  }, [filteredTickets]);

  // Excel / CSV Export Handler
  const handleExportExcel = () => {
    if (tickets.length === 0) {
      toast.error("No ticket records available to export.");
      return;
    }

    try {
      const headers = [
        "Ticket ID",
        "Subject",
        "Author Name",
        "Author Email",
        "Category",
        "Priority",
        "AI Suggested Priority",
        "AI Confidence Score",
        "Status",
        "Assigned To",
        "Total Messages",
        "Created Date",
        "Initial Query",
      ];

      const escapeCell = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = tickets.map((t) => [
        escapeCell(t.ticket_id || t._id),
        escapeCell(t.subject),
        escapeCell(t.author_name || "Author"),
        escapeCell(t.author_email || ""),
        escapeCell(t.category || "General Inquiry"),
        escapeCell(t.priority || "Medium"),
        escapeCell(t.ai_priority || "—"),
        escapeCell(
          t.ai_confidence_score != null
            ? `${Math.round(t.ai_confidence_score * 100)}%`
            : "—",
        ),
        escapeCell(t.status || "Open"),
        escapeCell(t.assigned_to || "Unassigned"),
        escapeCell(t.messages?.length || 0),
        escapeCell(
          t.createdAt
            ? new Date(t.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
        ),
        escapeCell(t.message || ""),
      ]);

      // UTF-8 Byte Order Mark for Excel Unicode preservation
      const csvContent =
        "\uFEFF" +
        [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `bookleaf_support_tickets_report_${timestamp}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Successfully exported ${tickets.length} tickets to Excel (CSV)!`,
      );
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate export file. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        {/* Header with Title & Action Controls */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm text-gray-500">Admin / Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Support Operations Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Live author support requests, AI triage performance, and resolution analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold text-gray-600 shadow-xs">
              <button
                type="button"
                onClick={() => setPeriod("all")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  period === "all"
                    ? "bg-[#e76577] text-white shadow-xs"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setPeriod("30d")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  period === "30d"
                    ? "bg-[#e76577] text-white shadow-xs"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriod("7d")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  period === "7d"
                    ? "bg-[#e76577] text-white shadow-xs"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                Last 7 Days
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadDashboardData}
              title="Refresh dashboard metrics"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:bg-gray-50 hover:text-[#e76577]"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="Download support tickets report as Excel CSV"
              className="inline-flex items-center gap-2 rounded-xl bg-[#e76577] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#d95468] active:scale-95"
            >
              <FileSpreadsheet size={18} />
              <span>Export to Excel</span>
            </button>
          </div>
        </section>

        {/* Error Alert if any */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Tickets */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  ) : (
                    stats.total
                  )}
                </h2>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Ticket size={22} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              All author inquiries recorded
            </p>
          </div>

          {/* Unresolved Tickets */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Unresolved Tickets
                </p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  ) : (
                    stats.unresolved
                  )}
                </h2>
              </div>
              <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                <Clock3 size={22} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Awaiting resolution or reply
            </p>
          </div>

          {/* Critical & High Priority */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Critical & High Priority
                </p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  ) : (
                    stats.criticalHigh
                  )}
                </h2>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <AlertCircle size={22} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Require urgent team escalation
            </p>
          </div>

          {/* Resolved Tickets */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Resolved Tickets
                </p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  ) : (
                    stats.resolved
                  )}
                </h2>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Successfully resolved queries
            </p>
          </div>
        </section>

        {/* Urgent Attention Banner if Critical Tickets Exist */}
        {stats.criticalHigh > 0 && (
          <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/70 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertCircle size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-red-900">
                  {stats.criticalHigh} Critical or High-Priority Tickets Need Attention
                </h3>
                <p className="text-sm text-red-700">
                  Urgent royalty disputes, ISBN mismatches, or printing quality issues require fast resolution.
                </p>
              </div>
            </div>

            <Link
              href="/admin/tickets"
              className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Review Tickets →
            </Link>
          </section>
        )}

        {/* Charts: By Category & By Status */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Tickets by Category */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Tickets by Category
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Distribution of support requests across BookLeaf operations
                </p>
              </div>
              <Link
                href="/admin/tickets"
                className="text-xs font-semibold text-[#e76577] hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="mt-7 space-y-4">
              {categoriesData.map((category) => {
                const percentage =
                  totalCategorized > 0
                    ? (category.count / totalCategorized) * 100
                    : 0;

                return (
                  <div key={category.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-700">
                        {category.name}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {category.count}
                        <span className="ml-2 font-normal text-gray-400">
                          {percentage.toFixed(0)}%
                        </span>
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${category.color}`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 border-t border-gray-100 pt-4 text-xs text-gray-500">
              Total categorized tickets:{" "}
              <span className="font-semibold text-gray-900">
                {totalCategorized}
              </span>
            </div>
          </div>

          {/* Tickets by Status */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Tickets by Status
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Current ticket lifecycle and completion progress
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {totalStatusTickets} total
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {statusData.map((item) => {
                const pct =
                  totalStatusTickets > 0
                    ? ((item.count / totalStatusTickets) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={item.name}
                    className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                      />
                      <span className="text-sm font-medium text-gray-600">
                        {item.name}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">
                      {item.count}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {pct}% of all tickets
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                <span>Overall status distribution</span>
                <span className="font-semibold text-gray-900">
                  {stats.resolutionRate}% resolved
                </span>
              </div>

              <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                {statusData.map((item) => (
                  <div
                    key={item.name}
                    className={`h-full ${item.color} transition-all duration-500`}
                    style={{
                      width: `${
                        totalStatusTickets > 0
                          ? (item.count / totalStatusTickets) * 100
                          : 0
                      }%`,
                    }}
                    title={`${item.name}: ${item.count}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Resolution Performance Cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                <Clock3 size={21} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Resolution Rate</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.resolutionRate}%
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Share of all tickets successfully resolved or closed
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pink-50 p-3 text-[#e76577]">
                <Headset size={21} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Workload</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.workload} tickets
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Open and In-Progress queries awaiting staff response
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle2 size={21} />
              </div>
              <div>
                <p className="text-sm text-gray-500">AI Triage Status</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">Active</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Google Gemini 2.5 Flash classification & draft engine
            </p>
          </div>
        </section>

        {/* Recent Tickets Table (Live Database Records) */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="font-semibold text-gray-900">
                Recent Support Tickets
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Live incoming queries from published authors
              </p>
            </div>

            <Link
              href="/admin/tickets"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#e76577] hover:underline"
            >
              <span>View full ticket queue</span>
              <ExternalLink size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-[#e76577]" />
                        <span>Loading live tickets...</span>
                      </div>
                    </td>
                  </tr>
                ) : recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No support tickets found in the database.
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => {
                    const ticketDisplayId = ticket.ticket_id || ticket._id;
                    const createdFormatted = ticket.createdAt
                      ? new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently";

                    return (
                      <tr
                        key={ticket._id}
                        className="transition hover:bg-gray-50/80"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/tickets/${encodeURIComponent(ticket._id)}`}
                            className="font-semibold text-gray-900 hover:text-[#e76577]"
                          >
                            {ticketDisplayId}
                            <span className="mt-1 block max-w-[280px] truncate text-xs font-normal text-gray-500">
                              {ticket.subject}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {ticket.author_name || "Author"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {ticket.author_email || ""}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {ticket.category || "General Inquiry"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge type={ticket.priority || "Medium"}>
                            {ticket.priority || "Medium"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge type={ticket.status || "Open"}>
                            {ticket.status || "Open"}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                          {createdFormatted}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/tickets/${encodeURIComponent(ticket._id)}`}
                            className="rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-semibold text-[#e76577] transition hover:bg-[#e76577] hover:text-white"
                          >
                            Open Ticket
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-xs text-gray-500">
              Showing {recentTickets.length} of {filteredTickets.length} total live tickets
            </p>
            <Link
              href="/admin/tickets"
              className="text-xs font-semibold text-[#e76577] hover:underline"
            >
              Go to Ticket Triage Queue →
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col justify-between gap-2 pb-2 text-xs text-gray-400 sm:flex-row">
          <p>BookLeaf Author Support Portal</p>
          <p>Admin Operations & AI Intelligence Hub</p>
        </footer>
      </div>
    </main>
  );
}
