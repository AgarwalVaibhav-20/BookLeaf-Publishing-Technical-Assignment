import { z } from "zod";

export const authorBookSchema = z.object({
  book_id: z.string().trim().min(1, "Book ID is required."),
  title: z.string().trim().min(1, "Book title is required."),
  isbn: z.string().trim().default("Pending"),
  genre: z.string().trim().min(1, "Genre is required."),
  publication_date: z.string().trim().nullable().optional(),
  status: z.string().trim().min(1, "Book status is required."),
  mrp: z.number().nonnegative("MRP cannot be negative.").nullable().optional(),
  author_royalty_per_copy: z
    .number()
    .nonnegative("Royalty per copy cannot be negative.")
    .nullable()
    .optional(),
  total_copies_sold: z
    .number()
    .int()
    .nonnegative("Copies sold must be a non-negative integer.")
    .default(0),
  total_royalty_earned: z
    .number()
    .nonnegative("Total royalty cannot be negative.")
    .default(0),
  royalty_paid: z
    .number()
    .nonnegative("Paid royalty cannot be negative.")
    .default(0),
  royalty_pending: z
    .number()
    .nonnegative("Pending royalty cannot be negative.")
    .default(0),
  last_royalty_payout_date: z.string().trim().nullable().optional(),
  print_partner: z.string().trim().nullable().optional(),
  available_on: z.array(z.string().trim()).default([]),
});

export const authorSchema = z.object({
  author_id: z.string().trim().min(1, "Author ID is required."),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(50),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  phone: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  joined_date: z.string().trim().nullable().optional(),
  books: z.array(authorBookSchema).default([]),
});

export type AuthorInput = z.infer<typeof authorSchema>;
export type AuthorBookInput = z.infer<typeof authorBookSchema>;