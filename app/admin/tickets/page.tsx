"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Ticket,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronDown,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Low" | "Medium" | "High" | "Critical";

type SupportTicket = {
  id: string;
  mongoId: string;
  subject: string;
  author: string;
  email: string;
  category: string;
  priority: TicketPriority;
  ai_priority?: TicketPriority;
  ai_confidence_score?: number | null;
  status: TicketStatus;
  createdAt: string;
  assignedTo: string;
  message: string;
  latestMessage: string;
  messageCount: number;
};

const priorityStyles: Record<TicketPriority, string> = {
  Critical: "bg-red-50 text-red-700 ring-red-100",
  High: "bg-orange-50 text-orange-700 ring-orange-100",
  Medium: "bg-amber-50 text-amber-700 ring-amber-100",
  Low: "bg-gray-100 text-gray-600 ring-gray-200",
};

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    let active = true;

    fetch("/api/tickets", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("Ticket service returned an invalid response.");
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load support tickets.");
        }
        if (!Array.isArray(data.tickets)) {
          throw new Error("Ticket service returned an invalid ticket list.");
        }
        return data.tickets.map(
          (ticket: {
            _id: string;
            ticket_id?: string;
            subject: string;
            author_name?: string;
            author_email?: string;
            category?: string;
            priority?: TicketPriority;
            ai_priority?: TicketPriority;
            ai_confidence_score?: number | null;
            status?: TicketStatus;
            createdAt?: string;
            message?: string;
            messages?: Array<{ sender?: string; message?: string }>;
            assigned_to?: string;
          }): SupportTicket => {
            const latestMessage =
              ticket.messages?.at(-1)?.message || ticket.message || "";
            const id = ticket.ticket_id || ticket._id;

            return {
              id,
              mongoId: ticket._id,
              subject: ticket.subject,
              author: ticket.author_name || "Author",
              email: ticket.author_email || "",
              category: ticket.category || "General Inquiry",
              priority: ticket.priority || ticket.ai_priority || "Medium",
              ai_priority: ticket.ai_priority,
              ai_confidence_score: ticket.ai_confidence_score,
              status: ticket.status || "Open",
              createdAt: ticket.createdAt
                ? new Date(ticket.createdAt).toLocaleDateString()
                : "—",
              assignedTo: ticket.assigned_to || "Unassigned",
              message: ticket.message || "",
              latestMessage,
              messageCount: ticket.messages?.length ?? 0,
            };
          },
        );
      })
      .then((data) => {
        if (active) {
          setTickets(data);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load support tickets.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const standardCategories = [
    "Royalty & Payments",
    "ISBN & Metadata Issues",
    "Printing & Quality",
    "Distribution & Availability",
    "Book Status & Production Updates",
    "General Inquiry",
  ];

  const categories = Array.from(
    new Set([
      ...standardCategories,
      ...tickets.map((ticket) => ticket.category),
    ]),
  );

  const stats = [
    {
      label: "Total Tickets",
      value: tickets.length,
      icon: Ticket,
      color: "bg-pink-50 text-[#e76577]",
    },
    {
      label: "Open Tickets",
      value: tickets.filter((t) => t.status === "Open").length,
      icon: Clock3,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "High Priority",
      value: tickets.filter(
        (t) => t.priority === "High" || t.priority === "Critical",
      ).length,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Resolved",
      value: tickets.filter(
        (t) => t.status === "Resolved" || t.status === "Closed",
      ).length,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
  ];

  const filteredTickets = useMemo(() => {
    const term = search.toLowerCase().trim();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !term ||
        ticket.id.toLowerCase().includes(term) ||
        ticket.subject.toLowerCase().includes(term) ||
        ticket.author.toLowerCase().includes(term) ||
        ticket.email.toLowerCase().includes(term) ||
        ticket.latestMessage.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || ticket.priority === priorityFilter;

      const matchesCategory =
        categoryFilter === "All" || ticket.category === categoryFilter;

      return (
        matchesSearch && matchesStatus && matchesPriority && matchesCategory
      );
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter]);

  async function updateStatus(
    id: string,
    mongoId: string,
    status: TicketStatus,
  ) {
    const previous = tickets.find((t) => t.id === id)?.status;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id ? { ...ticket, status } : ticket,
      ),
    );

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(mongoId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update ticket status.");
      }

      toast.success(`Ticket ${id} status updated to "${status}"`);
    } catch (err) {
      if (previous) {
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === id ? { ...ticket, status: previous } : ticket,
          ),
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Could not update status.",
      );
    }
  }

  async function updatePriority(
    id: string,
    mongoId: string,
    priority: TicketPriority,
  ) {
    const previous = tickets.find((t) => t.id === id)?.priority;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id ? { ...ticket, priority } : ticket,
      ),
    );

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(mongoId)}/priority`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update priority.");
      }

      toast.success(`Ticket ${id} priority overridden to "${priority}"`);
    } catch (err) {
      if (previous) {
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === id ? { ...ticket, priority: previous } : ticket,
          ),
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Could not update priority.",
      );
    }
  }

  async function updateCategory(
    id: string,
    mongoId: string,
    category: string,
  ) {
    const previous = tickets.find((t) => t.id === id)?.category;
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id ? { ...ticket, category } : ticket,
      ),
    );

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(mongoId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update category.");
      }

      toast.success(`Ticket ${id} category overridden to "${category}"`);
    } catch (err) {
      if (previous) {
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === id ? { ...ticket, category: previous } : ticket,
          ),
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Could not update category.",
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm text-gray-500">Admin / Tickets</p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Support Tickets
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage author requests, assign priorities and track resolutions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={21} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Across your support queue
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Filter size={18} className="text-[#e76577]" />
            <h2 className="font-semibold text-gray-900">Search & Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets, authors..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#e76577] focus:ring-2 focus:ring-pink-100"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 pr-9 text-sm text-gray-600 outline-none focus:border-[#e76577]"
              >
                <option value="All">All statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 pr-9 text-sm text-gray-600 outline-none focus:border-[#e76577]"
              >
                <option value="All">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 pr-9 text-sm text-gray-600 outline-none focus:border-[#e76577]"
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredTickets.length}
              </span>{" "}
              of {tickets.length} tickets
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-[#e76577] hover:underline"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 className="font-semibold text-gray-900">All Tickets</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review, update and manage author support requests.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading support tickets...
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket size={32} className="mx-auto text-gray-300" />
              <h3 className="mt-4 font-semibold text-gray-900">
                No tickets found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 text-sm font-semibold text-[#e76577]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Ticket Cards (Visible on < md screens) */}
              <div className="p-3.5 space-y-3.5 md:hidden">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs transition hover:border-rose-200"
                  >
                    {/* Header: ID, Date, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[#e76577]">
                          {ticket.id}
                        </span>
                        <h3 className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-1">
                          {ticket.subject}
                        </h3>
                      </div>
                      <select
                        aria-label={`Change status for ${ticket.id}`}
                        value={ticket.status}
                        onChange={(e) =>
                          updateStatus(
                            ticket.id,
                            ticket.mongoId,
                            e.target.value as TicketStatus,
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#e76577]"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {ticket.latestMessage || "No message provided"}
                    </p>

                    {/* Author Info */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-600 rounded-xl bg-gray-50/70 p-2.5">
                      <div>
                        <p className="font-semibold text-gray-800">{ticket.author}</p>
                        <p className="text-[10px] text-gray-400">{ticket.email}</p>
                      </div>
                      <span className="text-[10px] text-gray-400">{ticket.createdAt}</span>
                    </div>

                    {/* Classification & Priority Controls */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          Category
                        </label>
                        <select
                          value={ticket.category}
                          onChange={(e) =>
                            updateCategory(ticket.id, ticket.mongoId, e.target.value)
                          }
                          className="mt-1 w-full truncate rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#e76577]"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          <span>Priority</span>
                          {typeof ticket.ai_confidence_score === "number" && (
                            <span className="text-emerald-600 font-bold">
                              {ticket.ai_confidence_score}%
                            </span>
                          )}
                        </label>
                        <select
                          value={ticket.priority}
                          onChange={(e) =>
                            updatePriority(ticket.id, ticket.mongoId, e.target.value as TicketPriority)
                          }
                          className={`mt-1 w-full rounded-lg px-2 py-1 text-xs font-semibold outline-none ring-1 ring-inset ${priorityStyles[ticket.priority]}`}
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Footer action */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-3">
                      <span className="text-[11px] text-gray-400">
                        {ticket.messageCount > 0 ? `${ticket.messageCount} messages` : "No replies"}
                      </span>
                      <Link
                        href={`/admin/tickets/${ticket.mongoId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#e76577] hover:text-[#e76577]"
                      >
                        <Eye size={13} />
                        <span>View Ticket</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (Hidden on mobile < md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Ticket</th>
                      <th className="px-5 py-4 font-medium">Author</th>
                      <th className="px-5 py-4 font-medium">Category</th>
                      <th className="px-5 py-4 font-medium">Priority</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Assigned To</th>
                      <th className="px-5 py-4 font-medium">Created</th>
                      <th className="px-5 py-4 font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="transition hover:bg-gray-50/80"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#e76577]">
                            {ticket.id}
                          </p>
                          <p className="mt-1 max-w-[230px] truncate text-gray-700">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 max-w-[260px] truncate text-xs text-gray-400">
                            {ticket.latestMessage || "No message provided"}
                          </p>
                          {ticket.messageCount > 0 && (
                            <p className="mt-1 text-[11px] font-medium text-[#e76577]">
                              {ticket.messageCount}{" "}
                              {ticket.messageCount === 1 ? "reply" : "replies"}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-800">
                            {ticket.author}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {ticket.email}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          <select
                            aria-label={`Override category for ${ticket.id}`}
                            value={ticket.category}
                            onChange={(e) =>
                              updateCategory(
                                ticket.id,
                                ticket.mongoId,
                                e.target.value,
                              )
                            }
                            className="max-w-[170px] truncate rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#e76577] cursor-pointer"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <select
                              aria-label={`Override priority for ${ticket.id}`}
                              value={ticket.priority}
                              onChange={(e) =>
                                updatePriority(
                                  ticket.id,
                                  ticket.mongoId,
                                  e.target.value as TicketPriority,
                                )
                              }
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold outline-none ring-1 ring-inset transition cursor-pointer ${priorityStyles[ticket.priority]}`}
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                            {typeof ticket.ai_confidence_score === "number" && (
                              <span className="text-[10px] font-medium text-emerald-600">
                                AI: {ticket.ai_confidence_score}%
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`Change status for ${ticket.id}`}
                            value={ticket.status}
                            onChange={(e) =>
                              updateStatus(
                                ticket.id,
                                ticket.mongoId,
                                e.target.value as TicketStatus,
                              )
                            }
                            className="max-w-[145px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#e76577]"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>

                      <td className="px-5 py-4 text-gray-600">
                        {ticket.assignedTo}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {ticket.createdAt}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/tickets/${ticket.mongoId}`}
                          aria-label={`View ticket ${ticket.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#e76577] hover:text-[#e76577]"
                        >
                          <Eye size={15} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
          )}

          <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-400">
            Showing tickets and conversation messages from your support
            database.
          </div>
        </section>
      </div>
    </div>
  );
}
