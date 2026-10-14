"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  BookOpen,
  MapPin,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Eye,
  X,
  LoaderCircle,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface AuthorBook {
  book_id: string;
  title: string;
}

interface Author {
  _id: string;
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: AuthorBook[];
}

interface AuthorForm {
  name: string;
  email: string;
  phone: string;
  city: string;
}

const emptyForm: AuthorForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
};

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [form, setForm] = useState<AuthorForm>(emptyForm);
  const [page, setPage] = useState(1);

  const pageSize = 8;

  const fetchAuthors = useCallback(async (): Promise<Author[]> => {
    const response = await fetch("/api/authors", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch authors");
    }

    return Array.isArray(data.authors) ? data.authors : [];
  }, []);

  useEffect(() => {
    let active = true;

    fetchAuthors()
      .then((data) => {
        if (active) setAuthors(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Something went wrong"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchAuthors]);

  const filteredAuthors = authors.filter((author) => {
    const query = search.toLowerCase().trim();

    return (
      author.name.toLowerCase().includes(query) ||
      author.email.toLowerCase().includes(query) ||
      author.author_id.toLowerCase().includes(query) ||
      author.city.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAuthors.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedAuthors = filteredAuthors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const openCreateModal = () => {
    setEditingAuthor(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (author: Author) => {
    setEditingAuthor(author);
    setForm({
      name: author.name,
      email: author.email,
      phone: author.phone,
      city: author.city,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingAuthor(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = editingAuthor
        ? `/api/authors/${encodeURIComponent(editingAuthor.author_id)}`
        : "/api/authors";

      const response = await fetch(url, {
        method: editingAuthor ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationErrors = data.errors?.fieldErrors;
        const firstError = validationErrors
          ? Object.values(validationErrors).flat()[0]
          : undefined;

        throw new Error(
          firstError ||
            data.message ||
            "Unable to save author"
        );
      }

      const successMsg = data.message || (editingAuthor ? "Author updated successfully" : "Author created successfully");
      toast.success(successMsg);
      setModalOpen(false);
      setEditingAuthor(null);
      setForm(emptyForm);

      setAuthors(await fetchAuthors());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unable to save author";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (author: Author) => {
    const confirmed = window.confirm(
      `Permanently delete ${author.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `/api/authors/${encodeURIComponent(author.author_id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete author");
      }

      toast.success("Author deleted successfully");

      if (selectedAuthor?.author_id === author.author_id) {
        setSelectedAuthor(null);
      }

      setAuthors(await fetchAuthors());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete author";
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? date
      : parsedDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  return (
    <main className="min-h-screen bg-[#fff8f8] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1450px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span>Admin</span>
              <span>/</span>
              <span className="font-medium text-[#e76577]">
                Authors
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Authors Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage author profiles and their registered books.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d95166] focus:outline-none focus:ring-4 focus:ring-[#e76577]/20"
          >
            <Plus size={18} />
            Add Author
          </button>
        </div>


        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Authors"
            value={authors.length}
            description="Registered author profiles"
            icon={<Users size={21} />}
          />

          <StatCard
            title="Total Books"
            value={authors.reduce(
              (total, author) => total + (author.books?.length ?? 0),
              0
            )}
            description="Books linked to authors"
            icon={<BookOpen size={21} />}
          />

          <StatCard
            title="Cities Covered"
            value={
              new Set(
                authors
                  .map((author) => author.city.trim().toLowerCase())
                  .filter(Boolean)
              ).size
            }
            description="Unique author locations"
            icon={<MapPin size={21} />}
          />
        </div>

        {/* Table card */}
        <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                All Authors
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredAuthors.length} author
                {filteredAuthors.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search authors..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#e76577] focus:ring-4 focus:ring-[#e76577]/10 sm:w-72"
                />
              </div>

              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  void fetchAuthors()
                    .then(setAuthors)
                    .catch((err: unknown) => {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Something went wrong"
                      );
                    })
                    .finally(() => setLoading(false));
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Author</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Books</th>
                  <th className="px-5 py-4">Joined Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto animate-spin text-[#e76577]"
                      />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading authors...
                      </p>
                    </td>
                  </tr>
                ) : paginatedAuthors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#e76577]">
                        {error ? (
                          <AlertCircle size={25} />
                        ) : (
                          <Users size={25} />
                        )}
                      </div>
                      <p className="mt-4 font-semibold text-slate-800">
                        {error
                          ? "Could not load authors"
                          : "No authors found"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {error
                          ? "Check your API route and authentication."
                          : search
                            ? "Try another search term."
                            : "Add your first author to get started."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedAuthors.map((author) => (
                    <tr
                      key={author.author_id}
                      className="transition hover:bg-rose-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-sm font-bold text-[#d95166]">
                            {author.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {author.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {author.author_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="flex items-center gap-2 text-sm text-slate-700">
                          <Mail
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                          {author.email}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Phone
                            size={13}
                            className="shrink-0 text-slate-400"
                          />
                          {author.phone || "Not provided"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin size={15} className="text-slate-400" />
                          {author.city || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-[#c94e61]">
                          <BookOpen size={14} />
                          {author.books?.length ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(author.joined_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton
                            label="View author"
                            onClick={() => setSelectedAuthor(author)}
                          >
                            <Eye size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Edit author"
                            onClick={() => openEditModal(author)}
                          >
                            <Pencil size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Delete author"
                            danger
                            onClick={() => handleDelete(author)}
                          >
                            <Trash2 size={16} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {filteredAuthors.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              {" "}–{" "}
              {Math.min(currentPage * pageSize, filteredAuthors.length)}
              {" "}of {filteredAuthors.length} authors
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="px-2 text-sm font-medium text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingAuthor ? "Edit Author" : "Add New Author"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingAuthor
                    ? "Update the author's profile information."
                    : "Enter the author's details below."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <FormField label="Full Name" required>
                <input
                  required
                  minLength={2}
                  maxLength={50}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                  className="form-input"
                />
              </FormField>

              <FormField label="Email Address" required>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="author@example.com"
                  className="form-input"
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Phone Number" required>
                  <input
                    required
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="Phone number"
                    className="form-input"
                  />
                </FormField>

                <FormField label="City" required>
                  <input
                    required
                    value={form.city}
                    onChange={(event) =>
                      setForm({ ...form, city: event.target.value })
                    }
                    placeholder="City"
                    className="form-input"
                  />
                </FormField>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d95166] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingAuthor
                      ? "Save Changes"
                      : "Create Author"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Author details modal */}
      {selectedAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-rose-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-bold text-[#d95166] shadow-sm">
                  {selectedAuthor.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    {selectedAuthor.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedAuthor.author_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAuthor(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <DetailRow label="Email" value={selectedAuthor.email} />
              <DetailRow
                label="Phone"
                value={selectedAuthor.phone || "Not provided"}
              />
              <DetailRow
                label="City"
                value={selectedAuthor.city || "Not provided"}
              />
              <DetailRow
                label="Joined"
                value={formatDate(selectedAuthor.joined_date)}
              />

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Registered Books ({selectedAuthor.books?.length ?? 0})
                </p>

                {selectedAuthor.books?.length ? (
                  <div className="space-y-2">
                    {selectedAuthor.books.map((book) => (
                      <div
                        key={book.book_id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <div className="rounded-lg bg-rose-50 p-2 text-[#e76577]">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {book.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {book.book_id}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No books have been linked to this author yet.
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  const author = selectedAuthor;
                  setSelectedAuthor(null);
                  openEditModal(author);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e76577] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d95166]"
              >
                <Pencil size={16} />
                Edit Author
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared input styling */}
      <style jsx global>{`
        .form-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
          background: white;
        }
        .form-input::placeholder {
          color: #94a3b8;
        }
        .form-input:focus {
          border-color: #e76577;
          box-shadow: 0 0 0 3px rgb(231 101 119 / 12%);
        }
      `}</style>
    </main>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString("en-IN")}
          </p>
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div className="rounded-xl bg-rose-50 p-3 text-[#e76577]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
          : "text-slate-400 hover:bg-rose-50 hover:text-[#e76577]"
      }`}
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-[#e76577]">*</span>}
      </span>
      {children}
    </label>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-sm font-medium text-slate-800 sm:text-right">
        {value}
      </span>
    </div>
  );
}
