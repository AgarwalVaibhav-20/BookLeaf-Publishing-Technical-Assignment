"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Search,
  Plus,
  BookOpen,
  Users,
  IndianRupee,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
type Book = {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;

  total_copies_sold: number;

  total_royalty_earned: number;

  royalty_paid: number;

  royalty_pending: number;

  last_royalty_payout_date: string | null;

  print_partner: string | null;

  available_on: string[];
};

type Author = {
  author_id: string;

  name: string;

  email: string;

  books: Book[];
};

type BookRecord = Book & {
  author_id: string;

  author_name: string;

  author_email: string;
};

type BookForm = {
  author_id: string;

  title: string;

  isbn: string;

  genre: string;

  publication_date: string;

  status: string;

  mrp: string;

  author_royalty_per_copy: string;

  total_copies_sold: string;

  total_royalty_earned: string;

  royalty_paid: string;

  royalty_pending: string;

  last_royalty_payout_date: string;

  print_partner: string;

  available_on: string;
};

const emptyForm: BookForm = {
  author_id: "",

  title: "",

  isbn: "",

  genre: "",

  publication_date: "",

  status: "In Production",

  mrp: "",

  author_royalty_per_copy: "",

  total_copies_sold: "0",

  total_royalty_earned: "0",

  royalty_paid: "0",

  royalty_pending: "0",

  last_royalty_payout_date: "",

  print_partner: "",

  available_on: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#e76577] focus:ring-4 focus:ring-[#e76577]/10";

const currency = (amount: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "Not scheduled";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",

        month: "short",

        year: "numeric",
      });
};

function getStatusClass(status: string) {
  const value = status.toLowerCase();

  if (value.includes("published") || value.includes("live")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value.includes("production")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (value.includes("draft")) {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function toForm(record: BookRecord): BookForm {
  return {
    author_id: record.author_id,

    title: record.title,

    isbn: record.isbn,

    genre: record.genre,

    publication_date: record.publication_date ?? "",

    status: record.status,

    mrp: record.mrp == null ? "" : String(record.mrp),

    author_royalty_per_copy:
      record.author_royalty_per_copy == null
        ? ""
        : String(record.author_royalty_per_copy),

    total_copies_sold: String(record.total_copies_sold),

    total_royalty_earned: String(record.total_royalty_earned),

    royalty_paid: String(record.royalty_paid),

    royalty_pending: String(record.royalty_pending),

    last_royalty_payout_date: record.last_royalty_payout_date ?? "",

    print_partner: record.print_partner ?? "",

    available_on: record.available_on.join(", "),
  };
}

function formToBook(form: BookForm, bookId: string): Book {
  const numberOrNull = (value: string) =>
    value.trim() === "" ? null : Number(value);

  return {
    book_id: bookId,

    title: form.title.trim(),

    isbn: form.isbn.trim(),

    genre: form.genre.trim(),

    publication_date: form.publication_date || null,

    status: form.status,

    mrp: numberOrNull(form.mrp),

    author_royalty_per_copy: numberOrNull(form.author_royalty_per_copy),

    total_copies_sold: Number(form.total_copies_sold || 0),

    total_royalty_earned: Number(form.total_royalty_earned || 0),

    royalty_paid: Number(form.royalty_paid || 0),

    royalty_pending: Number(form.royalty_pending || 0),

    last_royalty_payout_date: form.last_royalty_payout_date || null,

    print_partner: form.print_partner.trim() || null,

    available_on: form.available_on

      .split(",")

      .map((item) => item.trim())

      .filter(Boolean),
  };
}

export default function AdminBooksPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);

  const handleRoyaltyPerCopyChange = (value: string) => {
    const rpc = parseFloat(value);
    const copies = parseFloat(form.total_copies_sold);
    const paid = parseFloat(form.royalty_paid) || 0;

    if (!Number.isNaN(rpc) && !Number.isNaN(copies)) {
      const earned = Math.round(rpc * copies * 100) / 100;
      const pending = Math.max(0, Math.round((earned - paid) * 100) / 100);
      setForm((prev) => ({
        ...prev,
        author_royalty_per_copy: value,
        total_royalty_earned: String(earned),
        royalty_pending: String(pending),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        author_royalty_per_copy: value,
      }));
    }
  };

  const handleCopiesSoldChange = (value: string) => {
    const copies = parseFloat(value);
    const rpc = parseFloat(form.author_royalty_per_copy);
    const paid = parseFloat(form.royalty_paid) || 0;

    if (!Number.isNaN(copies) && !Number.isNaN(rpc)) {
      const earned = Math.round(rpc * copies * 100) / 100;
      const pending = Math.max(0, Math.round((earned - paid) * 100) / 100);
      setForm((prev) => ({
        ...prev,
        total_copies_sold: value,
        total_royalty_earned: String(earned),
        royalty_pending: String(pending),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        total_copies_sold: value,
      }));
    }
  };

  const handleRoyaltyPaidChange = (value: string) => {
    const paid = parseFloat(value);
    const earned = parseFloat(form.total_royalty_earned) || 0;

    if (!Number.isNaN(paid)) {
      const pending = Math.max(0, Math.round((earned - paid) * 100) / 100);
      setForm((prev) => ({
        ...prev,
        royalty_paid: value,
        royalty_pending: String(pending),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        royalty_paid: value,
      }));
    }
  };

  const handleTotalRoyaltyEarnedChange = (value: string) => {
    const earned = parseFloat(value);
    const paid = parseFloat(form.royalty_paid) || 0;

    if (!Number.isNaN(earned)) {
      const pending = Math.max(0, Math.round((earned - paid) * 100) / 100);
      setForm((prev) => ({
        ...prev,
        total_royalty_earned: value,
        royalty_pending: String(pending),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        total_royalty_earned: value,
      }));
    }
  };

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchBooks = useCallback(async () => {
    const response = await fetch("/api/books", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to fetch books");
    }

    if (!Array.isArray(data.books)) {
      throw new Error("Expected a books array from GET /api/books.");
    }

    setBooks(data.books);
  }, []);

  const fetchAuthors = useCallback(async () => {
    const response = await fetch("/api/authors", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to fetch authors");
    }

    if (!Array.isArray(data.authors)) {
      throw new Error("Expected an authors array from GET /api/authors.");
    }

    setAuthors(data.authors);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchAuthors(), fetchBooks()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load books");
    } finally {
      setLoading(false);
    }
  }, [fetchAuthors, fetchBooks]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const filteredBooks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return books.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(query) ||
        book.book_id.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query) ||
        book.author_name.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" &&
          book.status.toLowerCase().includes("published")) ||
        (statusFilter === "production" &&
          book.status.toLowerCase().includes("production")) ||
        (statusFilter === "other" &&
          !book.status.toLowerCase().includes("published") &&
          !book.status.toLowerCase().includes("production"));

      return matchesSearch && matchesStatus;
    });
  }, [books, search, statusFilter]);

  const totalPages = Math.max(
    1,

    Math.ceil(filteredBooks.length / pageSize),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleBooks = filteredBooks.slice(
    (currentPage - 1) * pageSize,

    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalSales = books.reduce(
    (sum, book) => sum + book.total_copies_sold,

    0,
  );

  const totalRoyalty = books.reduce(
    (sum, book) => sum + book.total_royalty_earned,

    0,
  );

  const openCreate = () => {
    setEditingBook(null);

    setForm({
      ...emptyForm,

      author_id: authors[0]?.author_id ?? "",
    });

    setError("");

    setNotice("");

    setModalOpen(true);
  };

  const openEdit = (book: BookRecord) => {
    setEditingBook(book);

    setForm(toForm(book));

    setError("");

    setNotice("");

    setModalOpen(true);
  };

  const saveBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    setNotice("");

    if (!form.author_id) {
      setError("Select an author first.");

      return;
    }

    const numericFields = [
      ["MRP", form.mrp],

      ["Royalty per copy", form.author_royalty_per_copy],

      ["Copies sold", form.total_copies_sold],

      ["Total royalty", form.total_royalty_earned],

      ["Royalty paid", form.royalty_paid],

      ["Royalty pending", form.royalty_pending],
    ] as const;

    for (const [label, value] of numericFields) {
      if (value.trim() !== "" && !Number.isFinite(Number(value))) {
        setError(`${label} must be a valid number.`);

        return;
      }

      if (value.trim() !== "" && Number(value) < 0) {
        setError(`${label} cannot be negative.`);

        return;
      }
    }

    if (
      !Number.isInteger(Number(form.total_copies_sold)) ||
      Number(form.total_copies_sold) < 0
    ) {
      setError("Copies sold must be a non-negative integer.");

      return;
    }

    setSaving(true);

    try {
      const numberOrNull = (value: string) =>
        value.trim() === "" ? null : Number(value);

      const payload = {
        author_id: form.author_id,
        title: form.title.trim(),
        isbn: form.isbn.trim() || "Pending",
        genre: form.genre.trim(),
        status: form.status,
        publication_date: form.publication_date || null,
        mrp: numberOrNull(form.mrp),
        author_royalty_per_copy: numberOrNull(form.author_royalty_per_copy),
        total_copies_sold: Number(form.total_copies_sold || 0),
        total_royalty_earned: Number(form.total_royalty_earned || 0),
        royalty_paid: Number(form.royalty_paid || 0),
        royalty_pending: Number(form.royalty_pending || 0),
        last_royalty_payout_date: form.last_royalty_payout_date || null,
        print_partner: form.print_partner.trim() || null,
        available_on: form.available_on
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const url = editingBook
        ? `/api/books/${encodeURIComponent(editingBook.book_id)}`
        : "/api/books";

      const method = editingBook ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save book");
      }

      const successMsg = editingBook
        ? "Book updated successfully."
        : "Book created successfully.";
      toast.success(successMsg);

      setModalOpen(false);
      setEditingBook(null);

      await refreshData();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save book";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const deleteBook = async (book: BookRecord) => {
    if (
      !window.confirm(
        `Delete "${book.title}" from ${book.author_name}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/books/${encodeURIComponent(book.book_id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete book");
      }

      if (selectedBook?.book_id === book.book_id) {
        setSelectedBook(null);
      }

      toast.success("Book deleted successfully.");
      await refreshData();
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to delete book";
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f8] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Heading */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <span>Admin</span>

              <span>/</span>

              <span className="font-medium text-[#e76577]">Books</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Books Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage publications, authors, sales and royalty records.
            </p>
          </div>

          <button
            onClick={openCreate}
            disabled={authors.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d95166] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Add Book
          </button>
        </div>

        {/* Stats */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Books"
            value={books.length.toLocaleString("en-IN")}
            description="Across all author profiles"
            icon={<BookOpen size={21} />}
          />

          <StatCard
            title="Registered Authors"
            value={authors.length.toLocaleString("en-IN")}
            description="Authors with profiles"
            icon={<Users size={21} />}
          />

          <StatCard
            title="Copies Sold"
            value={totalSales.toLocaleString("en-IN")}
            description="Total recorded book sales"
            icon={<ShoppingCart size={21} />}
          />

          <StatCard
            title="Total Royalty"
            value={currency(totalRoyalty)}
            description="Recorded royalty earned"
            icon={<IndianRupee size={21} />}
          />
        </div>

        {/* Books table */}

        <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">All Books</h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredBooks.length} book
                {filteredBooks.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, ISBN, author..."
                  className={`${inputClass} pl-10 sm:w-72`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass + " sm:w-48"}
              >
                <option value="all">All statuses</option>

                <option value="published">Published</option>

                <option value="production">In Production</option>

                <option value="other">Other</option>
              </select>

              <button
                onClick={() => void refreshData()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Book</th>

                  <th className="px-5 py-4">Author</th>

                  <th className="px-5 py-4">Status</th>

                  <th className="px-5 py-4">MRP</th>

                  <th className="px-5 py-4">Copies Sold</th>

                  <th className="px-5 py-4">Royalty Earned</th>

                  <th className="px-5 py-4">Royalty Pending</th>

                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto animate-spin text-[#e76577]"
                      />

                      <p className="mt-3 text-sm text-slate-500">
                        Loading books...
                      </p>
                    </td>
                  </tr>
                ) : visibleBooks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#e76577]">
                        {error ? (
                          <AlertCircle className="text-[#e76577]" size={24} />
                        ) : (
                          <BookOpen className="text-[#e76577]" size={24} />
                        )}
                      </div>

                      <p className="mt-4 font-semibold text-slate-800">
                        {error ? "Unable to load books" : "No books found"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {error
                          ? "Check your API response and authentication."
                          : "Try another search or add a book to get started."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleBooks.map((book) => (
                    <tr
                      key={`${book.author_id}-${book.book_id}`}
                      className="transition hover:bg-rose-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-[#d95166]">
                            <BookOpen size={20} />
                          </div>

                          <div className="max-w-64">
                            <p className="font-semibold text-slate-800">
                              {book.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {book.book_id}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {book.isbn}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {book.author_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {book.author_id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex max-w-48 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${getStatusClass(book.status)}`}
                        >
                          {book.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {book.mrp == null ? "—" : currency(book.mrp)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {book.total_copies_sold.toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {currency(book.total_royalty_earned)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#d95166]">
                        {currency(book.royalty_pending)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton
                            label="View book"
                            onClick={() => setSelectedBook(book)}
                          >
                            <Eye size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Edit book"
                            onClick={() => openEdit(book)}
                          >
                            <Pencil size={16} />
                          </ActionButton>

                          <ActionButton
                            label="Delete book"
                            danger
                            onClick={() => deleteBook(book)}
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

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {filteredBooks.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              {" – "}
              {Math.min(currentPage * pageSize, filteredBooks.length)}
              {" of "}
              {filteredBooks.length} books
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="px-2 text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Add / Edit modal */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingBook ? "Edit Book" : "Add New Book"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Book details and royalty information.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={saveBook}
              className="max-h-[75vh] space-y-6 overflow-y-auto p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Author" required>
                  <select
                    required
                    value={form.author_id}
                    onChange={(event) =>
                      setForm({ ...form, author_id: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="">Select author</option>

                    {authors.map((author) => (
                      <option key={author.author_id} value={author.author_id}>
                        {author.name} ({author.author_id})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Book Title" required>
                  <input
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="Enter book title"
                    className={inputClass}
                  />
                </Field>

                <Field label="ISBN" required>
                  <input
                    required
                    value={form.isbn}
                    onChange={(event) =>
                      setForm({ ...form, isbn: event.target.value })
                    }
                    placeholder="Enter ISBN"
                    className={inputClass}
                  />
                </Field>

                <Field label="Genre" required>
                  <input
                    required
                    value={form.genre}
                    onChange={(event) =>
                      setForm({ ...form, genre: event.target.value })
                    }
                    placeholder="e.g. Fiction"
                    className={inputClass}
                  />
                </Field>

                <Field label="Status" required>
                  <select
                    required
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option>In Production</option>

                    <option>In Production - Cover Design</option>

                    <option>In Production - Typesetting</option>

                    <option>Published & Live</option>

                    <option>Draft</option>

                    <option>On Hold</option>
                  </select>
                </Field>

                <Field label="Publication Date">
                  <input
                    type="date"
                    value={form.publication_date}
                    onChange={(event) =>
                      setForm({
                        ...form,

                        publication_date: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="MRP (₹)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.mrp}
                    onChange={(event) =>
                      setForm({ ...form, mrp: event.target.value })
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>

                <Field label="Royalty Per Copy (₹)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.author_royalty_per_copy}
                    onChange={(event) =>
                      handleRoyaltyPerCopyChange(event.target.value)
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>

                <Field label="Copies Sold" required>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.total_copies_sold}
                    onChange={(event) =>
                      handleCopiesSoldChange(event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Total Royalty Earned (₹)" required>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.total_royalty_earned}
                      onChange={(event) =>
                        handleTotalRoyaltyEarnedChange(event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <span>Auto-calculated (Royalty/Copy × Copies Sold)</span>
                  </p>
                </Field>

                <Field label="Royalty Paid (₹)" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.royalty_paid}
                    onChange={(event) =>
                      handleRoyaltyPaidChange(event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Royalty Pending (₹)" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.royalty_pending}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        royalty_pending: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    <span>⚡</span>
                    <span>Auto-calculated (Total Earned − Royalty Paid)</span>
                  </p>
                </Field>

                <Field label="Last Royalty Payout Date">
                  <input
                    type="date"
                    value={form.last_royalty_payout_date}
                    onChange={(event) =>
                      setForm({
                        ...form,

                        last_royalty_payout_date: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Print Partner">
                  <input
                    value={form.print_partner}
                    onChange={(event) =>
                      setForm({
                        ...form,

                        print_partner: event.target.value,
                      })
                    }
                    placeholder="e.g. In-House"
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Available On">
                    <input
                      value={form.available_on}
                      onChange={(event) =>
                        setForm({
                          ...form,

                          available_on: event.target.value,
                        })
                      }
                      placeholder="Amazon India, Flipkart, BookLeaf Store"
                      className={inputClass}
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Separate platforms with commas.
                    </p>
                  </Field>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || authors.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e76577] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d95166] disabled:opacity-50"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingBook
                      ? "Save Changes"
                      : "Create Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View details modal */}

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-rose-50 p-6">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[#e76577] shadow-sm">
                  <BookOpen size={26} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedBook.title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedBook.book_id} · {selectedBook.genre}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClass(selectedBook.status)}`}
                  >
                    {selectedBook.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBook(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <Detail label="Author" value={selectedBook.author_name} />

              <Detail label="Author ID" value={selectedBook.author_id} />

              <Detail label="ISBN" value={selectedBook.isbn} />

              <Detail
                label="MRP"
                value={
                  selectedBook.mrp == null
                    ? "Not set"
                    : currency(selectedBook.mrp)
                }
              />

              <Detail
                label="Publication Date"
                value={dateLabel(selectedBook.publication_date)}
              />

              <Detail
                label="Print Partner"
                value={selectedBook.print_partner || "Not assigned"}
              />

              <Detail
                label="Copies Sold"
                value={selectedBook.total_copies_sold.toLocaleString("en-IN")}
              />

              <Detail
                label="Royalty Per Copy"
                value={
                  selectedBook.author_royalty_per_copy == null
                    ? "Not set"
                    : currency(selectedBook.author_royalty_per_copy)
                }
              />

              <Detail
                label="Royalty Earned"
                value={currency(selectedBook.total_royalty_earned)}
              />

              <Detail
                label="Royalty Paid"
                value={currency(selectedBook.royalty_paid)}
              />

              <Detail
                label="Royalty Pending"
                value={currency(selectedBook.royalty_pending)}
              />

              <Detail
                label="Last Payout"
                value={dateLabel(selectedBook.last_royalty_payout_date)}
              />

              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Available On
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedBook.available_on.length ? (
                    selectedBook.available_on.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {platform}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      No platforms listed
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  onClick={() => {
                    const book = selectedBook;

                    setSelectedBook(null);

                    openEdit(book);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e76577] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d95166]"
                >
                  <Pencil size={16} />
                  Edit Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

  value: string;

  description: string;

  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>

        <div className="rounded-xl bg-rose-50 p-3 text-[#e76577]">{icon}</div>
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
  children: ReactNode;

  label: string;

  onClick: () => void;

  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
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

function Field({
  label,

  required = false,

  children,
}: {
  label: string;

  required?: boolean;

  children: ReactNode;
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

function Detail({
  label,

  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
