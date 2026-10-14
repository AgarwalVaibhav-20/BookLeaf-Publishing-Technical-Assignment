import mongoose, { Schema, type Document } from "mongoose";

export interface AuthBooks {
    book_id: string;
    title: string;
    isbn?: string | null;
    genre: string;
    publication_date?: string | null;
    status: string;
    mrp?: number | null;
    author_royalty_per_copy?: number | null;
    total_copies_sold?: number;
    total_royalty_earned?: number;
    royalty_paid?: number;
    royalty_pending?: number;
    last_royalty_payout_date?: string | null;
    print_partner?: string | null;
    available_on: string[];
}

export interface Author extends Document {
    author_id: string;
    name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
    joined_date?: string | null;
    books: AuthBooks[];
}

const AuthBookSchema = new Schema<AuthBooks>(
    {
        book_id: { type: String, required: true },
        title: { type: String, required: true },
        isbn: { type: String, default: "Pending" },
        genre: { type: String, required: true, default: "General" },
        publication_date: { type: String, default: null },
        status: { type: String, required: true, default: "Draft" },
        mrp: { type: Number, default: 0 },
        author_royalty_per_copy: { type: Number, default: 0 },
        total_copies_sold: { type: Number, default: 0 },
        total_royalty_earned: { type: Number, default: 0 },
        royalty_paid: { type: Number, default: 0 },
        royalty_pending: { type: Number, default: 0 },
        last_royalty_payout_date: { type: String, default: null },
        print_partner: { type: String, default: null },
        available_on: { type: [String], default: [] },
    },
    { _id: false }
);

const AuthorSchema = new Schema<Author>(
    {
        author_id: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        joined_date: { type: String, required: true },
        books: { type: [AuthBookSchema], default: [] },
    },
    { timestamps: true }
);

export const AuthorModel =
    (mongoose.models.Author as mongoose.Model<Author> | undefined) ??
    mongoose.model<Author>("Author", AuthorSchema);
