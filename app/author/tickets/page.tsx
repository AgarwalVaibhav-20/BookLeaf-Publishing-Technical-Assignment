"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Ticket,
  Clock3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

type TicketItem = {
  _id: string;
  ticket_id?: string;
  subject: string;
  message?: string;
  description?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  category?: string;
  createdAt?: string;
};

const statusStyles: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestTickets = useCallback(async (): Promise<TicketItem[]> => {
    const response = await fetch("/api/tickets", {
      credentials: "include",
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        response.status === 404
          ? "The ticket service is not available yet. Please try again later."
          : "The ticket service returned an invalid response. Please try again.",
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load tickets.");
    }

    if (!Array.isArray(data.tickets)) {
      throw new Error("The ticket service returned an invalid ticket list.");
    }

    return data.tickets;
  }, []);

  useEffect(() => {
    let active = true;

    const loadTickets = () => {
      requestTickets()
        .then((data) => {
          if (!active) return;
          setTickets(data);
          setError("");
        })
        .catch((err: unknown) => {
          if (active) {
            setError(
              err instanceof Error ? err.message : "Something went wrong.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    loadTickets();

    // Near-real-time updates every 7 seconds.
    const interval = setInterval(loadTickets, 7000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [requestTickets]);

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    requestTickets()
      .then(setTickets)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => setLoading(false));
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      (ticket.ticket_id ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === "All" || ticket.status === status;

    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    progress: tickets.filter((t) => t.status === "In Progress").length,
    resolved: tickets.filter(
      (t) => t.status === "Resolved" || t.status === "Closed",
    ).length,
  };

  return (
    <main className="min-h-screen min-w-0 bg-[#f8f9fb] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-7xl space-y-7 lg:space-y-8">
        <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#d95268]">
              <Ticket size={15} />
              Author Support
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My Support Tickets
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Track your queries and communicate with the BookLeaf support team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/author/tickets/new"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-200/70 transition hover:-translate-y-0.5 hover:bg-[#d95268] sm:w-auto"
            >
              <Plus size={18} />
              New Support Query
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Tickets", value: counts.total, icon: Ticket },
            { label: "Open", value: counts.open, icon: AlertCircle },
            { label: "In Progress", value: counts.progress, icon: Clock3 },
            {
              label: "Resolved / Closed",
              value: counts.resolved,
              icon: CheckCircle2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {item.label}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#e76577]">
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Your queries</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a ticket to view its conversation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:flex">
              <div className="relative min-w-0">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tickets..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#e76577] focus:ring-4 focus:ring-rose-100 sm:w-56"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e76577] focus:ring-4 focus:ring-rose-100"
              >
                <option>All</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>

              <button
                onClick={handleRefresh}
                title="Refresh tickets"
                aria-label="Refresh tickets"
                className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading your tickets...
              </div>
            ) : error ? (
              <div className="px-5 py-14 text-center sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#e76577]">
                  <AlertCircle size={25} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  We couldn’t load your tickets
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {error}
                </p>
                <button
                  onClick={handleRefresh}
                  className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-[#d95268] transition hover:bg-rose-100"
                >
                  Try again
                </button>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#e76577]">
                  <Ticket size={26} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  No tickets found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Submit a support query if you need help with your book or
                  account.
                </p>
                <Link
                  href="/author/tickets/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#e76577] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  Create ticket
                </Link>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`/author/tickets/${ticket._id}`}
                  className="group flex flex-col gap-4 p-5 transition hover:bg-rose-50/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {ticket.ticket_id || `TKT-${ticket._id.slice(-6)}`}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[ticket.status] ?? statusStyles.Open
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900 group-hover:text-[#d95268]">
                      {ticket.subject}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {ticket.message ||
                        ticket.description ||
                        "No description provided."}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Created{" "}
                      {ticket.createdAt
                        ? new Date(ticket.createdAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <ArrowRight
                    size={19}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#e76577]"
                  />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
