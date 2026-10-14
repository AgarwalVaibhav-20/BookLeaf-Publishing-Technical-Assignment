import mongoose, { Schema, type Document } from "mongoose";

export const TICKET_CATEGORIES = [
  "Royalty & Payments",
  "ISBN & Metadata Issues",
  "Printing & Quality",
  "Distribution & Availability",
  "Book Status & Production Updates",
  "General Inquiry",
] as const;
export type TicketPriority = "Critical" | "High" | "Medium" | "Low";

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export type AIClassificationStatus = "pending" | "completed" | "failed";

export interface SupportTicketMessage {
  sender: string;
  senderRole: "Author" | "Admin";
  message: string;
  createdAt: Date;
}

export interface SupportTicket extends Document {
  ticket_id: string;
  subject: string;
  message: string;

  // Final category used by admin filters and ticket management.
  category: string;

  // Original category suggestion returned by Gemini.
  ai_category: TicketCategory;
  ai_classification_status: AIClassificationStatus;
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
  author_id: string;
  author_name: string;
  author_email: string;
  messages: SupportTicketMessage[];
  priority: TicketPriority;
  ai_priority: TicketPriority;
  ai_confidence_score?: number | null;
  assigned_to?: string | null;
  internal_notes: TicketInternalNote[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketInternalNote {
  _id?: string;
  author: string;
  note: string;
  createdAt: Date;
}

const TicketMessageSchema = new Schema<SupportTicketMessage>(
  {
    sender: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["Author", "Admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const TicketSchema = new Schema<SupportTicket>(
  {
    ticket_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
      default: "General Inquiry",
    },
    ai_category: {
      type: String,
      enum: TICKET_CATEGORIES,
      default: "General Inquiry",
    },
    ai_classification_status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    ai_reason: {
      type: String,
      default: null,
    },
    ai_draft_response: {
      type: String,
      default: null,
    },
    ai_model: {
      type: String,
      default: null,
    },
    ai_tokens_used: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ai_error: {
      type: String,
      default: null,
    },
    book_id: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    author_id: {
      type: String,
      required: true,
      index: true,
    },
    author_name: {
      type: String,
      required: true,
    },
    author_email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      required: true,
    },

    ai_priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      required: true,
    },
    ai_confidence_score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    messages: {
      type: [TicketMessageSchema],
      default: [],
    },
    assigned_to: {
      type: String,
      default: "Unassigned",
    },
    internal_notes: {
      type: [
        new Schema(
          {
            author: { type: String, required: true },
            note: { type: String, required: true, trim: true, maxlength: 3000 },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// In Next.js development, purge stale in-memory cached model if it lacks the 'failed' enum
if (mongoose.models && mongoose.models.Ticket) {
  const existingModel = mongoose.models.Ticket;
  const statusEnum = (existingModel.schema.paths.ai_classification_status as any)?.options?.enum;
  if (!statusEnum || !statusEnum.includes("failed")) {
    delete (mongoose.models as any).Ticket;
  }
}

export const TicketModel =
  (mongoose.models.Ticket as mongoose.Model<SupportTicket> | undefined) ??
  mongoose.model<SupportTicket>("Ticket", TicketSchema);
