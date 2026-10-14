"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  BookOpen,
  CalendarDays,
  Clock3,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Sparkles,
  Bot,
  Copy,
  Check,
  RotateCcw,
  Lock,
  Shield,
  UserCheck,
  Loader2,
  CornerDownLeft,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { socket } from "@/app/lib/socket";

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
type TicketPriority = "Low" | "Medium" | "High" | "Critical";

const priorities = ["Critical", "High", "Medium", "Low"] as const;
const statuses: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];
const ticketCategories = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
] as const;

type TicketMessage = {
  _id: string;
  sender: string;
  senderRole: "Author" | "Admin";
  message: string;
  createdAt: string;
};

type InternalNote = {
  _id: string;
  author: string;
  note: string;
  createdAt: string;
};

type TicketDetails = {
  _id: string;
  ticket_id: string;
  subject: string;
  message: string;
  author_id: string;
  author_name: string;
  author_email: string;
  category: string;
  ai_category?: string;
  ai_classification_status?: "pending" | "completed" | "failed";
  ai_reason?: string | null;
  ai_draft_response?: string | null;
  ai_model?: string | null;
  ai_tokens_used?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
  ai_error?: string | null;
  book_id: string | null;
  status: TicketStatus;
  priority?: TicketPriority;
  ai_priority?: TicketPriority;
  ai_confidence_score?: number | null;
  assigned_to?: string;
  internal_notes?: InternalNote[];
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
};

const priorityStyles: Record<TicketPriority, string> = {
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusStyles: Record<TicketStatus, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function AdminTicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;

  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Ticket & basic state
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status management state
  const [status, setStatus] = useState<TicketStatus>("Open");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Category management state
  const [category, setCategory] = useState("General Inquiry");
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // Priority management state
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState("");

  // Assignee management state
  const [assignedTo, setAssignedTo] = useState("Unassigned");
  const [updatingAssignedTo, setUpdatingAssignedTo] = useState(false);
  const [assignedToError, setAssignedToError] = useState("");
  const [currentAdminName, setCurrentAdminName] = useState("Admin");

  // Reply state
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // AI draft state
  const [aiDraft, setAiDraft] = useState("");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftCopied, setDraftCopied] = useState(false);
  const hasLoadedDraftRef = useRef(false);

  // Internal notes state
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  const messages = ticket?.messages ?? [];

  // Fetch current admin info for "Assign to Me"
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.name) {
          setCurrentAdminName(data.user.name);
        }
      })
      .catch(() => {
        // Fallback already "Admin"
      });
  }, []);

  // Request ticket details from backend
  const requestTicket = useCallback(async (): Promise<TicketDetails> => {
    const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      throw new Error("Ticket service returned an invalid response.");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load this ticket.");
    }
    if (!data.ticket || typeof data.ticket !== "object") {
      throw new Error("Ticket service returned invalid ticket details.");
    }

    return data.ticket as TicketDetails;
  }, [ticketId]);

  // Generate or Load AI Draft Response
  const fetchAiDraft = useCallback(
    async (force = false) => {
      if (!ticketId) return;
      setGeneratingDraft(true);
      setDraftError("");

      try {
        const response = await fetch(
          `/api/admin/tickets/${encodeURIComponent(ticketId)}/draft`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forceRegenerate: force }),
          },
        );

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("AI draft service returned an invalid response.");
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to generate AI draft response.");
        }

        if (data.draft) {
          setAiDraft(data.draft);
          if (data.cached) {
            toast.info("Loaded cached AI draft response.");
          } else {
            toast.success("AI draft generated successfully.");
          }
        }
      } catch (err) {
        setDraftError(
          err instanceof Error
            ? err.message
            : "Unable to generate AI draft response. Please compose your reply manually.",
        );
      } finally {
        setGeneratingDraft(false);
      }
    },
    [ticketId],
  );

  // Load ticket on mount
  useEffect(() => {
    let active = true;

    requestTicket()
      .then((data) => {
        if (!active) return;
        setTicket(data);
        setStatus(data.status);
        if (data.category) {
          setCategory(data.category);
        }
        if (data.priority) {
          setPriority(data.priority);
        }
        if (data.assigned_to) {
          setAssignedTo(data.assigned_to);
        }
        if (data.internal_notes) {
          setInternalNotes(data.internal_notes);
        }

        // Token Optimization: Reuse persisted draft if present.
        // Do NOT trigger an unsolicited Gemini API call on ticket view.
        if (data.ai_draft_response) {
          setAiDraft(data.ai_draft_response);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load this ticket.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestTicket]);

  // Real-time socket room listening for incoming author messages
  useEffect(() => {
    if (!ticketId) return;

    try {
      if (!socket.connected) socket.connect();
      socket.emit("ticket:join", ticketId);
    } catch {}

    function onSocketNewMessage(data: any) {
      if (data?.ticket_id === ticketId || data?.ticketId === ticketId) {
        requestTicket().then((updated) => {
          setTicket(updated);
          setStatus(updated.status);
          const msgs = updated.messages ?? [];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.senderRole === "Author") {
            window.dispatchEvent(
              new CustomEvent("bookleaf:new-message", {
                detail: {
                  sender: updated.author_name || "Author",
                  text: lastMsg.message,
                  ticketId,
                },
              }),
            );
          }
        });
      }
    }

    socket.on("message:new", onSocketNewMessage);

    return () => {
      socket.off("message:new", onSocketNewMessage);
      if (ticketId) {
        try {
          socket.emit("ticket:leave", ticketId);
        } catch {}
      }
    };
  }, [ticketId, requestTicket]);

  // Update Status in MongoDB
  async function handleStatusUpdate(newStatus: TicketStatus) {
    if (newStatus === status) return;
    setUpdatingStatus(true);
    setStatusError("");

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update ticket status.");
      }

      setStatus(newStatus);
      if (ticket) {
        setTicket({ ...ticket, status: newStatus });
      }
      toast.success(`Ticket status updated to "${newStatus}"`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update status.";
      setStatusError(msg);
      toast.error(msg);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Update Category in MongoDB (Admin AI Override)
  async function handleCategoryUpdate(newCategory: string) {
    if (newCategory === category) return;
    setUpdatingCategory(true);
    setCategoryError("");

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: newCategory }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update category.");
      }

      setCategory(newCategory);
      if (ticket) {
        setTicket({ ...ticket, category: newCategory });
      }
      toast.success(`Category overridden to "${newCategory}"`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update category.";
      setCategoryError(msg);
      toast.error(msg);
    } finally {
      setUpdatingCategory(false);
    }
  }

  // Update Assignee in MongoDB
  async function handleAssigneeUpdate(newAssignee: string) {
    setUpdatingAssignedTo(true);
    setAssignedToError("");

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigned_to: newAssignee }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update assignee.");
      }

      setAssignedTo(newAssignee);
      if (ticket) {
        setTicket({ ...ticket, assigned_to: newAssignee });
      }
      toast.success(`Ticket assigned to ${newAssignee}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update assignee.";
      setAssignedToError(msg);
      toast.error(msg);
    } finally {
      setUpdatingAssignedTo(false);
    }
  }

  // Quick Action: Assign to Myself
  async function handleAssignToMe() {
    const me = currentAdminName || "Admin";
    await handleAssigneeUpdate(me);
  }

  // Add Internal Note (Staff Only)
  async function handleAddInternalNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const noteText = newNote.trim();
    if (!noteText) return;

    setAddingNote(true);
    setNoteError("");

    try {
      const response = await fetch(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/notes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteText }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save internal note.");
      }

      if (data.notes) {
        setInternalNotes(data.notes);
      } else {
        setInternalNotes((prev) => [
          ...prev,
          {
            _id: Date.now().toString(),
            author: currentAdminName || "Admin",
            note: noteText,
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      setNewNote("");
      toast.success("Internal note added (hidden from author)");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to add internal note.";
      setNoteError(msg);
      toast.error(msg);
    } finally {
      setAddingNote(false);
    }
  }

  // Copy AI Draft to Clipboard
  function handleCopyDraft() {
    if (!aiDraft) return;
    navigator.clipboard.writeText(aiDraft);
    setDraftCopied(true);
    toast.success("AI draft copied to clipboard!");
    setTimeout(() => setDraftCopied(false), 2000);
  }

  // Insert AI Draft into Reply box for editing before sending
  function handleUseDraft() {
    if (!aiDraft) return;
    setReply(aiDraft);
    toast.success("Draft inserted into reply box. Review and edit before sending!");
    setTimeout(() => {
      replyTextareaRef.current?.focus();
      replyTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // Send Reply to Author (appears on author's ticket view)
  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reply.trim();
    if (!message) return;

    setSending(true);
    setSendError("");

    try {
      const response = await fetch(
        `/api/tickets/${encodeURIComponent(ticketId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Ticket service returned an invalid response.");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to send your reply.");
      }

      setReply("");
      toast.success("Reply successfully sent to author!");

      // Refresh ticket details to include the new message
      const updatedTicket = await requestTicket();
      setTicket(updatedTicket);
      setStatus(updatedTicket.status);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to send your reply.";
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="animate-spin text-[#e76577]" size={36} />
          <p className="text-sm font-medium text-gray-600">
            Loading ticket details & conversations...
          </p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto text-[#e76577]" size={32} />
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Unable to load ticket
          </h1>
          <p className="mt-2 text-sm text-gray-500">{error || "Ticket not found."}</p>
          <Link
            href="/admin/tickets"
            className="mt-5 inline-flex rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Tickets
          </Link>
        </div>
      </main>
    );
  }

  const isAssignedToMe =
    assignedTo.toLowerCase() === (currentAdminName || "").toLowerCase() ||
    assignedTo.toLowerCase() === "admin";

  return (
    <main className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#e76577]"
        >
          <ArrowLeft size={17} />
          Back to Tickets
        </Link>

        {/* Header */}
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-pink-50 px-3 py-1.5 text-sm font-bold text-[#e76577]">
                {ticket.ticket_id}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  priorityStyles[ticket.priority ?? priority]
                }`}
              >
                {ticket.priority ?? priority} Priority
              </span>
              {ticket.ai_classification_status === "failed" ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  title={ticket.ai_error || "AI classification was unavailable at ticket creation"}
                >
                  <AlertCircle size={12} />
                  AI Fallback
                </span>
              ) : typeof ticket.ai_confidence_score === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Sparkles size={12} />
                  AI Score: {ticket.ai_confidence_score}%
                </span>
              ) : null}
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
              >
                {status}
              </span>
              {assignedTo && assignedTo !== "Unassigned" && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  Assigned: {assignedTo}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {ticket.subject}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Review author inquiry, review AI-drafted policy response, collaborate with internal notes, and reply.
            </p>
          </div>

          {/* Quick Header Status Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {status !== "Resolved" ? (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusUpdate("Resolved")}
                className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-50"
              >
                {updatingStatus ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Resolve Ticket
              </button>
            ) : (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusUpdate("In Progress")}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
              >
                {updatingStatus ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Reopen Ticket
              </button>
            )}

            {status !== "Closed" ? (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusUpdate("Closed")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e76577] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d95468] disabled:opacity-50"
              >
                {updatingStatus ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                Close Ticket
              </button>
            ) : (
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleStatusUpdate("Open")}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-50"
              >
                Reopen as Open
              </button>
            )}
          </div>
        </section>

        {/* Ticket details, Conversation, AI Draft & Reply */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {/* Description (Author's initial message) */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="rounded-xl bg-pink-50 p-3 text-[#e76577]">
                  <MessageSquare size={21} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Author Query Description
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Original message from {ticket.author_name}
                  </p>
                </div>
              </div>

              <div className="py-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                  {ticket.message}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-100 pt-4 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} />
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={15} />
                  Updated: {new Date(ticket.updatedAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen size={15} />
                  Category: {ticket.category}
                </span>
              </div>
            </section>

            {/* Conversation Thread */}
            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Conversation History
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {messages.length + 1} message{messages.length + 1 === 1 ? "" : "s"} in this thread (visible to author)
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="More conversation options"
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {/* Initial Query Bubble */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {ticket.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {ticket.author_name}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Author
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                      {ticket.message}
                    </div>
                  </div>
                </div>

                {/* Follow-up messages */}
                {messages.map((item) => {
                  const isAdmin = item.senderRole === "Admin";

                  return (
                    <div key={item._id} className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          isAdmin
                            ? "bg-pink-100 text-[#e76577]"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.sender.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {item.sender}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isAdmin
                                ? "bg-pink-50 text-[#e76577]"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {item.senderRole}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div
                          className={`mt-3 rounded-xl p-4 text-sm leading-7 ${
                            isAdmin
                              ? "border border-pink-100 bg-pink-50/50 text-gray-800"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ========================================================= */}
              {/* AI-DRAFTED RESPONSE CARD (Based on Knowledge Base) */}
              {/* ========================================================= */}
              <div className="border-t border-gray-100 bg-gradient-to-b from-rose-50/40 via-white to-gray-50/60 p-5 sm:p-6">
                <div className="rounded-2xl border border-rose-200/80 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#e76577] to-pink-500 text-white shadow-sm">
                        <Bot size={19} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">
                            AI-Drafted Response
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-[#e76577]">
                            <Sparkles size={10} />
                            BookLeaf Knowledge Base
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Tailored response based on author inquiry & publishing guidelines
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyDraft}
                        disabled={!aiDraft || generatingDraft}
                        title="Copy draft to clipboard"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                      >
                        {draftCopied ? (
                          <>
                            <Check size={13} className="text-green-600" />
                            <span className="text-green-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => fetchAiDraft(true)}
                        disabled={generatingDraft}
                        title="Regenerate draft using Gemini and targeted Knowledge Base policy"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                      >
                        <RotateCcw
                          size={13}
                          className={generatingDraft ? "animate-spin text-[#e76577]" : ""}
                        />
                        <span>{generatingDraft ? "Drafting..." : "Regenerate"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Draft Body Content */}
                  <div className="mt-4">
                    {generatingDraft ? (
                      <div className="flex items-center gap-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-5 text-sm text-gray-600">
                        <Loader2 className="animate-spin text-[#e76577]" size={20} />
                        <div>
                          <p className="font-semibold text-gray-800">
                            Consulting BookLeaf Knowledge Base...
                          </p>
                          <p className="text-xs text-gray-500">
                            Analyzing targeted {ticket.category || "General"} policy &amp; conversation history with bounded tokens.
                          </p>
                        </div>
                      </div>
                    ) : draftError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertCircle size={14} />
                          <span>AI Draft Unavailable</span>
                        </div>
                        <p className="mt-1">{draftError}</p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fetchAiDraft(true)}
                            className="font-semibold underline hover:text-red-900"
                          >
                            Retry AI Generation
                          </button>
                          <span className="text-red-300">•</span>
                          <span className="text-gray-600">Manual response editor remains fully functional below.</span>
                        </div>
                      </div>
                    ) : aiDraft ? (
                      <div className="space-y-3">
                        <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-100 bg-[#fbfbfc] p-4 text-xs leading-6 text-gray-700 sm:text-sm">
                          {aiDraft}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <p className="text-xs text-gray-400">
                            Review and customize in the reply composer below before sending.
                          </p>
                          <button
                            type="button"
                            onClick={handleUseDraft}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-pink-50 px-3.5 py-2 text-xs font-semibold text-[#e76577] transition hover:bg-pink-100"
                          >
                            <CornerDownLeft size={14} />
                            Insert Draft into Reply Box
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                        <Bot size={28} className="mb-2 text-gray-400" />
                        <p className="text-xs font-medium text-gray-700">No AI draft generated yet</p>
                        <p className="mt-1 max-w-sm text-[11px] text-gray-400">
                          Generate an on-demand response draft based on BookLeaf publishing guidelines and ticket context.
                        </p>
                        <button
                          type="button"
                          onClick={() => fetchAiDraft(false)}
                          disabled={generatingDraft}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-pink-50 px-4 py-2 text-xs font-semibold text-[#e76577] transition hover:bg-pink-100 disabled:opacity-50"
                        >
                          <Sparkles size={13} />
                          Generate AI Draft
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply Composer Form */}
                <form
                  id="admin-reply-form"
                  onSubmit={sendReply}
                  className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <label
                      htmlFor="admin-reply"
                      className="block text-sm font-semibold text-gray-900"
                    >
                      Reply to Author ({ticket.author_name})
                    </label>
                    <span className="text-xs text-gray-400">
                      Visible on author&apos;s portal
                    </span>
                  </div>

                  <textarea
                    id="admin-reply"
                    ref={replyTextareaRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your response to the author (or click 'Insert Draft into Reply Box' above to edit the AI draft)..."
                    rows={5}
                    maxLength={5000}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-[#fbfbfc] p-4 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-[#e76577] focus:bg-white focus:ring-2 focus:ring-pink-100"
                  />

                  {sendError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {sendError}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col justify-end gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      {aiDraft && reply !== aiDraft && (
                        <button
                          type="button"
                          onClick={handleUseDraft}
                          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                          Use AI Draft
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!reply.trim() || sending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d95468] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>

          {/* ========================================================= */}
          {/* SIDEBAR: Management, Assignment & Internal Staff Notes */}
          {/* ========================================================= */}
          <aside className="space-y-6">
            {/* Author Details Card */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Author Details</h2>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-lg font-bold text-[#e76577]">
                  {ticket.author_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {ticket.author_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">BookLeaf Author</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-400">Email Address</p>
                  <p className="mt-0.5 break-all text-sm font-medium text-gray-700">
                    {ticket.author_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Author ID</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-700">
                    {ticket.author_id}
                  </p>
                </div>
              </div>
            </section>

            {/* Ticket Management (Persisted directly to MongoDB) */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-semibold text-gray-900">Ticket Management</h2>
                <span className="text-[11px] font-medium text-emerald-600">
                  Live MongoDB
                </span>
              </div>

              <div className="mt-4 space-y-5">
                {/* Status Dropdown */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="ticket-status"
                      className="block text-xs font-semibold text-gray-600"
                    >
                      Ticket Status
                    </label>
                    {updatingStatus && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Loader2 size={11} className="animate-spin text-[#e76577]" />
                        Saving...
                      </span>
                    )}
                  </div>
                  <select
                    id="ticket-status"
                    value={status}
                    disabled={updatingStatus}
                    onChange={(e) =>
                      handleStatusUpdate(e.target.value as TicketStatus)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e76577] disabled:opacity-50"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {statusError && (
                    <p className="mt-1 text-xs text-red-600">{statusError}</p>
                  )}
                </div>

                {/* Category Dropdown (AI Override) */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="ticket-category"
                      className="block text-xs font-semibold text-gray-600"
                    >
                      Category
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      {ticket.ai_classification_status === "failed" ? (
                        <span className="font-medium text-amber-600">
                          AI: Fallback
                        </span>
                      ) : ticket.ai_category ? (
                        <span>
                          AI:{" "}
                          <span className="font-semibold text-gray-700">
                            {ticket.ai_category}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <select
                    id="ticket-category"
                    value={ticket.category ?? category}
                    disabled={updatingCategory}
                    onChange={(e) => handleCategoryUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e76577] disabled:opacity-50"
                  >
                    {ticketCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {categoryError && (
                    <p className="mt-1 text-xs text-red-600">{categoryError}</p>
                  )}
                </div>

                {/* Priority Dropdown */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="ticket-priority"
                      className="block text-xs font-semibold text-gray-600"
                    >
                      Priority
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      {ticket.ai_classification_status === "failed" ? (
                        <span className="font-medium text-amber-600">
                          AI: Fallback
                        </span>
                      ) : ticket.ai_priority ? (
                        <span>
                          AI:{" "}
                          <span className="font-semibold text-gray-700">
                            {ticket.ai_priority}
                          </span>
                        </span>
                      ) : null}
                      {ticket.ai_classification_status !== "failed" &&
                        typeof ticket.ai_confidence_score === "number" && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                            {ticket.ai_confidence_score}%
                          </span>
                        )}
                    </div>
                  </div>
                  <select
                    id="ticket-priority"
                    value={ticket.priority ?? priority}
                    disabled={updatingPriority}
                    onChange={async (event) => {
                      const newPriority = event.target.value as TicketPriority;
                      setPriorityError("");
                      setUpdatingPriority(true);
                      try {
                        const response = await fetch(
                          `/api/admin/tickets/${ticket._id}/priority`,
                          {
                            method: "PATCH",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ priority: newPriority }),
                          },
                        );
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data.message || "Could not update priority.");
                        }
                        setPriority(newPriority);
                        if (ticket) setTicket({ ...ticket, priority: newPriority });
                        toast.success(`Priority updated to ${newPriority}`);
                      } catch (err) {
                        const msg =
                          err instanceof Error
                            ? err.message
                            : "Could not update priority.";
                        setPriorityError(msg);
                        toast.error(msg);
                      } finally {
                        setUpdatingPriority(false);
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e76577] disabled:opacity-50"
                  >
                    {priorities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {priorityError && (
                    <p className="mt-1 text-xs text-red-600">{priorityError}</p>
                  )}
                </div>

                {/* Assignee & "Assign to Me" */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="assigned-to"
                      className="block text-xs font-semibold text-gray-600"
                    >
                      Assigned Staff
                    </label>
                    {updatingAssignedTo && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Loader2 size={11} className="animate-spin text-[#e76577]" />
                        Saving...
                      </span>
                    )}
                  </div>

                  <select
                    id="assigned-to"
                    value={assignedTo}
                    disabled={updatingAssignedTo}
                    onChange={(e) => handleAssigneeUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e76577] disabled:opacity-50"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="Support Team">Support Team</option>
                    <option value="Admin">Admin</option>
                    {currentAdminName && currentAdminName !== "Admin" && (
                      <option value={currentAdminName}>{currentAdminName}</option>
                    )}
                    {assignedTo &&
                      ![
                        "Unassigned",
                        "Support Team",
                        "Admin",
                        currentAdminName,
                      ].includes(assignedTo) && (
                        <option value={assignedTo}>{assignedTo}</option>
                      )}
                  </select>

                  {assignedToError && (
                    <p className="mt-1 text-xs text-red-600">{assignedToError}</p>
                  )}

                  {/* Assign to Me Button */}
                  <div className="mt-2.5">
                    {isAssignedToMe ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
                        <Check size={14} />
                        Assigned to you ({currentAdminName || "Admin"})
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingAssignedTo}
                        onClick={handleAssignToMe}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs font-semibold text-[#e76577] transition hover:bg-rose-100/70 disabled:opacity-50"
                      >
                        <UserCheck size={14} />
                        Assign to Me ({currentAdminName || "Admin"})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================= */}
            {/* INTERNAL NOTES (STRICTLY HIDDEN FROM AUTHOR) */}
            {/* ========================================================= */}
            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/20 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      Internal Notes
                    </h2>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Staff only • Hidden from author
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {internalNotes.length} note{internalNotes.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Notes List */}
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {internalNotes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-3 text-center text-xs text-gray-500">
                    No internal notes yet. Use internal notes to record investigation details or handoffs.
                  </p>
                ) : (
                  internalNotes.map((note, index) => (
                    <div
                      key={note._id || index}
                      className="rounded-xl border border-amber-200/60 bg-white p-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {note.author}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(note.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-gray-700">
                        {note.note}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddInternalNote} className="mt-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a private staff note (investigation, phone call, ticket status)..."
                  rows={2}
                  maxLength={3000}
                  className="w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-xs leading-5 outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                />

                {noteError && (
                  <p className="mt-1 text-xs text-red-600">{noteError}</p>
                )}

                <button
                  type="submit"
                  disabled={!newNote.trim() || addingNote}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingNote ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Saving Note...
                    </>
                  ) : (
                    <>
                      <Shield size={13} />
                      Add Internal Note
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Related Book Details */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen size={17} className="text-[#e76577]" />
                <h2 className="font-semibold text-gray-900">Related Book</h2>
              </div>

              <div className="mt-3 rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-800">
                  {ticket.book_id || "General publishing query"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Category: {ticket.category}
                </p>
              </div>
            </section>

            {/* Activity History */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound size={17} className="text-[#e76577]" />
                <h2 className="font-semibold text-gray-900">Activity History</h2>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Ticket created by {ticket.author_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {messages.map((message) => (
                  <div key={message._id} className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        message.senderRole === "Admin"
                          ? "bg-[#e76577]"
                          : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {message.senderRole === "Admin"
                          ? "Support staff replied"
                          : `${message.sender} replied`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <footer className="flex items-center justify-between pb-4 text-xs text-gray-400">
          <span>BookLeaf Author Support Portal</span>
          <span>Admin Ticket Workspace • Powered by Gemini AI</span>
        </footer>
      </div>
    </main>
  );
}
