"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { socket } from "@/app/lib/socket";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Ticket,
} from "lucide-react";

type TicketMessage = {
  _id?: string;
  message?: string;
  content?: string;
  sender?: string;
  senderRole?: string;
  createdAt?: string;
};

type TicketDetails = {
  _id: string;
  ticket_id?: string;
  subject: string;
  message?: string;
  description?: string;
  status: string;
  category?: string;
  book_title?: string;
  bookTitle?: string;
  createdAt?: string;
  messages?: TicketMessage[];
};

const statusStyles: Record<string, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AuthorTicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const requestTicket = useCallback(async (): Promise<TicketDetails> => {
    if (!ticketId) {
      throw new Error("Ticket ID is missing.");
    }

    const response = await fetch(
      `/api/tickets/${encodeURIComponent(ticketId)}`,
      {
        credentials: "include",
        cache: "no-store",
      },
    );

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        response.status === 404
          ? "This ticket could not be found."
          : "The ticket service returned an invalid response. Please try again.",
      );
    }
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load this ticket.");
    }

    if (!data.ticket || typeof data.ticket !== "object") {
      throw new Error("The ticket service returned invalid ticket details.");
    }

    return data.ticket as TicketDetails;
  }, [ticketId]);

  const prevMsgCountRef = useRef<number>(-1);

  useEffect(() => {
    let active = true;

    const loadTicket = () => {
      requestTicket()
        .then((data) => {
          if (!active) return;
          setTicket(data);
          setError("");
          setLastUpdated(new Date());

          const msgs = data.messages ?? [];
          if (
            prevMsgCountRef.current !== -1 &&
            msgs.length > prevMsgCountRef.current
          ) {
            const latest = msgs[msgs.length - 1];
            if (
              latest &&
              (latest.senderRole === "Admin" ||
                (latest.sender &&
                  latest.sender.toLowerCase().includes("support")))
            ) {
              window.dispatchEvent(
                new CustomEvent("bookleaf:new-message", {
                  detail: {
                    sender: "BookLeaf Support",
                    text: latest.message || latest.content,
                    ticketId,
                  },
                }),
              );
            }
          }
          prevMsgCountRef.current = msgs.length;
        })
        .catch((err: unknown) => {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load this ticket.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    loadTicket();

    // Real-time socket room join
    if (ticketId) {
      try {
        if (!socket.connected) socket.connect();
        socket.emit("ticket:join", ticketId);
      } catch {}
    }

    function onSocketNewMessage(data: any) {
      if (data?.ticket_id === ticketId || data?.ticketId === ticketId) {
        loadTicket();
      }
    }

    socket.on("message:new", onSocketNewMessage);

    const interval = setInterval(() => {
      loadTicket();
    }, 6000);

    return () => {
      active = false;
      clearInterval(interval);
      socket.off("message:new", onSocketNewMessage);
      if (ticketId) {
        try {
          socket.emit("ticket:leave", ticketId);
        } catch {}
      }
    };
  }, [requestTicket, ticketId]);

  const refreshTicket = () => {
    setLoading(true);
    setError("");
    requestTicket()
      .then((data) => {
        setTicket(data);
        setLastUpdated(new Date());
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Unable to load this ticket.",
        );
      })
      .finally(() => setLoading(false));
  };

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError("");

    if (reply.trim().length < 1) {
      setSendError("Please enter a message.");
      return;
    }

    if (ticket?.status === "Closed" || ticket?.status === "Resolved") {
      setSendError(
        "This ticket is resolved or closed. Contact support if you need further help.",
      );
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticketId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: reply.trim(),
          }),
        },
      );

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "The ticket service returned an invalid response. Please try again.",
        );
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send your message.");
      }

      setReply("");
      const updatedTicket = await requestTicket();
      setTicket(updatedTicket);
      setLastUpdated(new Date());
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Unable to send your message.",
      );
    } finally {
      setSending(false);
    }
  }

  const messages = ticket?.messages ?? [];
  const originalQuery = ticket?.message || ticket?.description || "";

  function isAdminMessage(message: TicketMessage) {
    const role =
      `${message.senderRole ?? ""} ${message.sender ?? ""}`.toLowerCase();

    return (
      role.includes("admin") ||
      role.includes("support") ||
      role.includes("agent")
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-rose-100 border-t-[#e76577]" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your conversation...
          </p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Ticket className="mx-auto text-[#e76577]" size={32} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Unable to open ticket
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "This ticket could not be found."}
          </p>
          <button
            onClick={refreshTicket}
            className="mt-5 rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </button>
          <div>
            <Link
              href="/author/tickets"
              className="mt-4 inline-block text-sm font-medium text-slate-500 hover:text-[#e76577]"
            >
              Back to My Tickets
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const closed = ticket.status === "Closed" || ticket.status === "Resolved";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/author/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#e76577]"
        >
          <ArrowLeft size={17} />
          Back to My Tickets
        </Link>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_290px]">
          <section className="min-w-0 space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-[#e76577]">
                  {ticket.ticket_id || `TKT-${ticket._id.slice(-6)}`}
                </span>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    statusStyles[ticket.status] ?? statusStyles.Open
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-bold text-slate-900">
                {ticket.subject}
              </h1>

              <p className="mt-3 text-sm text-slate-500">
                Submitted{" "}
                {ticket.createdAt
                  ? new Date(ticket.createdAt).toLocaleString()
                  : "date unavailable"}
              </p>

              {ticket.category && (
                <p className="mt-3 inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                  {ticket.category}
                </p>
              )}
            </header>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#e76577]">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Conversation
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your query and support team responses
                    </p>
                  </div>
                </div>

                <button
                  onClick={refreshTicket}
                  title="Refresh conversation"
                  className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="space-y-5 p-5 sm:p-7">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <BookOpen size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Your original query
                      </span>
                      <span className="text-xs text-slate-400">
                        {ticket.createdAt
                          ? new Date(ticket.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                      {originalQuery || "No query description provided."}
                    </div>
                  </div>
                </div>

                {messages.map((message, index) => {
                  const admin = isAdminMessage(message);
                  const content = message.message || message.content || "";

                  return (
                    <div
                      key={message._id || `${index}-${content.slice(0, 20)}`}
                      className={`flex gap-3 ${admin ? "" : "flex-row-reverse"}`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          admin
                            ? "bg-rose-100 text-[#e76577]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {admin ? (
                          <Headphones size={17} />
                        ) : (
                          <BookOpen size={17} />
                        )}
                      </div>

                      <div
                        className={`min-w-0 flex-1 ${
                          admin ? "" : "text-right"
                        }`}
                      >
                        <div
                          className={`flex flex-wrap items-center gap-2 ${
                            admin ? "" : "justify-end"
                          }`}
                        >
                          <span className="text-sm font-semibold text-slate-900">
                            {admin ? "BookLeaf Support" : "You"}
                          </span>
                          {message.createdAt && (
                            <span className="text-xs text-slate-400">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div
                          className={`mt-2 inline-block max-w-full whitespace-pre-wrap break-words rounded-xl p-4 text-left text-sm leading-6 ${
                            admin
                              ? "rounded-tl-sm bg-rose-50 text-slate-700"
                              : "rounded-tr-sm bg-[#e76577] text-white"
                          }`}
                        >
                          {content}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                    <MessageCircle
                      size={22}
                      className="mx-auto text-slate-400"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      No replies yet. Our support team will respond here.
                    </p>
                  </div>
                )}

                {lastUpdated && (
                  <p className="text-center text-xs text-slate-400">
                    Last synced at {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              {closed ? (
                <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
                  <CheckCircle2
                    size={21}
                    className="shrink-0 text-emerald-600"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      This ticket is {ticket.status.toLowerCase()}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Replies are disabled for this ticket. If you need more
                      assistance, submit a new support query.
                    </p>
                    <Link
                      href="/author/tickets/new"
                      className="mt-3 inline-block text-sm font-semibold text-[#e76577]"
                    >
                      Create a new query
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-semibold text-slate-900">
                    Reply to support
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add more information or respond to the support team.
                  </p>

                  <form onSubmit={handleReply} className="mt-5 space-y-4">
                    {sendError && (
                      <p
                        role="alert"
                        className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                      >
                        {sendError}
                      </p>
                    )}

                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Write your message..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#e76577] focus:ring-2 focus:ring-rose-100"
                    />

                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <p className="text-xs text-slate-400">
                        {reply.length}/5000 characters
                      </p>
                      <button
                        type="submit"
                        disabled={sending || !reply.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95268] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={16} />
                        {sending ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#e76577]">
                  <Ticket size={20} />
                </div>
                <h2 className="font-semibold text-slate-900">
                  Ticket information
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Ticket ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-800">
                    {ticket.ticket_id || ticket._id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {ticket.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Category</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {ticket.category || "Pending classification"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Related book</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {ticket.book_title ||
                      ticket.bookTitle ||
                      "General / Account Level"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Created on</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {ticket.createdAt
                      ? new Date(ticket.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
              <ShieldCheck size={23} className="text-[#e76577]" />
              <h3 className="mt-3 font-semibold text-slate-900">
                Your support matters
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep all communication in this ticket so the BookLeaf support
                team can follow your query and respond in one place.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Clock3 size={14} />
                Conversation syncs automatically
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
