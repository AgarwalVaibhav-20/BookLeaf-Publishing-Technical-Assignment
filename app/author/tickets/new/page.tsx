"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Send,
  Sparkles,
  Ticket,
} from "lucide-react";

type AuthorBook = {
  book_id?: string;
  _id?: string;
  title: string;
  isbn?: string;
  status?: string;
};

export default function NewSupportTicketPage() {
  const [books, setBooks] = useState<AuthorBook[]>([]);
  const [bookId, setBookId] = useState("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [createdTicket, setCreatedTicket] = useState<{
    ticket_id: string;
    category: string;
    priority?: string;
    ai_confidence_score?: number | null;
    ai_classification_status: "pending" | "completed";
    ai_reason?: string | null;
  } | null>(null);
  useEffect(() => {
    async function loadBooks() {
      try {
        const response = await fetch("/api/author/books", {
          credentials: "include",
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            "The books service returned an invalid response. Please try again.",
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load your books.");
        }

        if (!Array.isArray(data.books)) {
          throw new Error("The books service returned an invalid book list.");
        }

        setBooks(data.books);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load your books.",
        );
      } finally {
        setLoadingBooks(false);
      }
    }

    void loadBooks();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (subject.trim().length < 5) {
      setError("Subject must contain at least 5 characters.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Please provide at least 20 characters describing your query.");
      return;
    }

    setSubmitting(true);

    try {
      // Attachment UI only: file contents are not uploaded.
      const response = await fetch("/api/tickets", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: description.trim(),
          book_id: bookId === "general" ? null : bookId,
          bookId: bookId === "general" ? null : bookId,
        }),
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
        throw new Error(data.message || "Unable to submit your ticket.");
      }

      setSuccess(true);
      setSubject("");
      setDescription("");
      setBookId("general");

      setCreatedTicket({
        ticket_id: data.ticket.ticket_id,
        category:
          data.ticket.category || data.ticket.ai_category || "General Inquiry",
        priority: data.ticket.priority || data.ticket.ai_priority,
        ai_confidence_score: data.ticket.ai_confidence_score ?? null,
        ai_classification_status:
          data.ticket.ai_classification_status || "completed",
        ai_reason: data.ticket.ai_reason ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/author/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#e76577]"
        >
          <ArrowLeft size={17} />
          Back to My Tickets
        </Link>

        <header className="mt-7">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-[#e76577]">
            <Ticket size={25} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Submit a Support Query
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Need help with your book, royalties, printing or account? Send a
            message to the BookLeaf support team and track the response here.
          </p>
        </header>

        {success ? (
          <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={34} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Query submitted successfully
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your support request has been received and analyzed by our AI
              system.
            </p>

            {createdTicket && (
              <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 text-left shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3.5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ticket Reference
                    </span>
                    <p className="font-mono text-base font-bold text-slate-900">
                      {createdTicket.ticket_id}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      createdTicket.ai_classification_status === "completed"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        createdTicket.ai_classification_status === "completed"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    {createdTicket.ai_classification_status === "completed"
                      ? "AI Categorized"
                      : "Pending AI"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-[#e76577]">
                      <Sparkles size={15} />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Assigned Category:
                    </span>
                    <span className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-bold text-[#e76577]">
                      {createdTicket.category}
                    </span>
                    {createdTicket.priority && (
                      <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Priority: {createdTicket.priority}
                      </span>
                    )}
                    {typeof createdTicket.ai_confidence_score === "number" && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Confidence: {createdTicket.ai_confidence_score}%
                      </span>
                    )}
                  </div>

                  {createdTicket.ai_reason && (
                    <div className="rounded-xl border border-rose-100/80 bg-white/90 p-3 text-xs leading-relaxed text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      <span className="font-semibold text-slate-800">
                        AI Context:{" "}
                      </span>
                      {createdTicket.ai_reason}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/author/tickets"
                className="inline-flex items-center justify-center rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95268]"
              >
                View My Tickets
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setCreatedTicket(null);
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Submit Another Query
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#e76577]">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Query details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Fields marked with * are required.
                  </p>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="book"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Which book is your query about?
                    <span className="ml-1 text-[#e76577]">*</span>
                  </label>

                  <div className="relative">
                    <BookOpen
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <select
                      id="book"
                      value={bookId}
                      onChange={(e) => setBookId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-[#e76577] focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="general">General / Account Level</option>
                      {books.map((book) => {
                        const id = book.book_id || book._id;

                        if (!id) return null;

                        return (
                          <option key={id} value={id}>
                            {book.title}
                            {book.isbn ? ` — ISBN: ${book.isbn}` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {loadingBooks
                      ? "Loading your books..."
                      : `${books.length} book(s) available`}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Subject <span className="text-[#e76577]">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={150}
                    required
                    placeholder="e.g. Royalty payment for my latest book"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#e76577] focus:ring-2 focus:ring-rose-100"
                  />
                  <div className="mt-2 text-right text-xs text-slate-400">
                    {subject.length}/150
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Describe your query{" "}
                    <span className="text-[#e76577]">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={7}
                    placeholder="Please explain the issue in detail. Include relevant dates or other information that can help our team resolve your query."
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-[#e76577] focus:ring-2 focus:ring-rose-100"
                  />
                  <div className="mt-2 flex justify-between gap-3 text-xs text-slate-400">
                    <span>Please enter at least 20 characters.</span>
                    <span>{description.length}/5000</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
              <Link
                href="/author/tickets"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || loadingBooks}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d95268] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Submit Query
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
