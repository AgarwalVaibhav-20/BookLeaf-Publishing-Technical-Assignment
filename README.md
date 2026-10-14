# BookLeaf Author Support & Communication Portal

> **Full-Stack Technical Assessment — Full-Stack Developer Position**  
> Built with **Next.js 16 (App Router)**, **TypeScript**, **MongoDB Atlas (Mongoose)**, **Google Gemini AI (`@google/genai`)**, and **Socket.IO** real-time communication engine.

---

## 📑 Table of Contents
1. [Live Demo & Test Credentials](#-1-live-demo--test-credentials)
2. [Visual Walkthrough & Screenshots](#-2-visual-walkthrough--screenshots)
3. [Architecture & System Design](#-3-architecture--system-design)
4. [AI Integration Quality (25% Evaluation Weight)](#-4-ai-integration-quality-25-weight)
   - [Model Choice Justification](#41-model-choice-justification-gemini-25-flash)
   - [Prompt Engineering & Tone Calibration](#42-prompt-engineering--tone-calibration)
   - [Knowledge Base Grounding & Business Policies](#43-knowledge-base-grounding--policy-alignment)
   - [Error Handling & Graceful Degradation](#44-error-handling--graceful-degradation)
   - [Cost Awareness & Token Optimization](#45-cost-awareness--token-optimization)
5. [Complete REST API Documentation](#-5-complete-rest-api-documentation)
6. [Real-Time Notification Engine](#-6-real-time-notification-engine)
7. [Edge Cases & Product Thinking (10% Weight)](#-7-edge-cases--product-thinking)
8. [Local Installation & Setup Guide](#-8-local-installation--setup-guide)
9. [Automated Test Suite (`npm test`)](#-9-automated-test-suite)
10. [1-Page Architectural Write-Up](#-10-architectural-write-up)

---

## 🔑 1. Live Demo & Test Credentials

* **Live Demo URL**: `https://bookleaf-portal.vercel.app` *(or localhost:3000)*
* **Pre-Seeded Database**: Pre-loaded with the official BookLeaf dataset containing 10 authors and 18 books across all publishing and royalty lifecycle states.

### 👥 Test Login Accounts

| Role | Email | Password | Access Level & Features |
| :--- | :--- | :--- | :--- |
| **Admin (Operations)** | `exampple@gmail.com` | `password123` | Full access to ticket triage queue, AI response drafting, priority overrides, staff assignments, and internal notes. |
| **Author 1 (Active)** | `priya.sharma@email.com` | `password123` | Author of *Whispers of the Ganges* (Published, ₹3,570 pending royalty) & *The Saffron Diaries* (₹0 pending). |
| **Author 2 (Tech)** | `rohit.kapoor@email.com` | `password123` | Author of *Code & Karma* (Self-Help / Tech, published). |
| **Author 3 (Production)** | `arjun.malhotra@email.com` | `password123` | Author with books currently in typesetting/production and active distribution queries. |
| **Any Seeded Author** | `<author.email>` from `bookleaf_sample_data.json` | `password123` | Dynamic on-demand provisioning for any author email in the seed dataset. |

---

## 🖼️ 2. Visual Walkthrough & Screenshots

All high-resolution application screenshots are stored in [`public/screenshots/`](./public/screenshots/):

| View | Screenshot | Description |
| :--- | :---: | :--- |
| **Author Dashboard** | `public/screenshots/author-dashboard.png` | Comprehensive dashboard showing copies sold, royalties earned/pending, quick ticket launcher, and real-time alerts. |
| **My Books & Royalties** | `public/screenshots/my-books.png` | Published catalog showing ISBN, MRP, 80/20 royalty split earnings, payment cycle statuses, and stock availability. |
| **Support Query Submission** | `public/screenshots/ticket-submission.png` | Query submission form with book-specific linkage, category selector, file attachment mock, and live AI classification. |
| **Admin Ticket Triage Queue** | `public/screenshots/admin-ticket-queue.png` | Filterable operations queue (Status, Category, Priority, Date) highlighting urgent queries and response times. |
| **AI Response Drafter** | `public/screenshots/ai-draft-response.png` | Policy-grounded Gemini response generator with one-click insertion into the reply box and admin manual edit mode. |
| **Interactive Notification Center** | `public/screenshots/notification-center.png` | Live dropdown popover showing unread badges, message snippets, direct ticket navigation, and "Mark all read". |

---

## 🏗️ 3. Architecture & System Design

The system is built on a modular, decoupled architecture adhering to clean coding standards, strict separation of concerns, and type safety:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                           │
├────────────────────────────┬───────────────────────────────────────────┤
│    Author Portal (/author) │     Admin Operations Portal (/admin)      │
│  - Dashboard & Royalties   │   - Ticket Triage & Multi-Filter Queue    │
│  - Submit Support Query    │   - Staff Assignment & Internal Notes     │
│  - Ticket Tracking         │   - AI Response Drafter & Overrides       │
│  - Interactive Bell Center │   - Real-time Ticket Resolution           │
└─────────────┬──────────────┴─────────────────────┬─────────────────────┘
              │                                    │
              ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     REST API & Auth Layer (/api)                       │
│  - JWT Cookie & Bearer Token Authentication                            │
│  - Strict Role-Based Access Control (Author vs Admin)                  │
│  - Input Validation via Zod Schemas                                    │
│  - Standardized JSON responses with HTTP status codes                  │
└─────────────┬────────────────────────────────────┬─────────────────────┘
              │                                    │
              ├────────────────────────────────────┼─────────────────────┐
              ▼                                    ▼                     ▼
┌───────────────────────────┐        ┌───────────────────────┐ ┌───────────────┐
│     MongoDB Atlas         │        │ Google Gemini AI SDK  │ │   Socket.IO   │
│  - TicketModel (Mongoose) │        │ - Bounded Backoff     │ │ Real-Time Hub │
│  - UserModel (Auth & RBAC)│        │ - Category Policies   │ │ - Live sync   │
│  - AuthorModel (Books)    │        │ - MongoDB AI Caching  │ │ - Multi-tab   │
│  - Persisted AI Drafts    │        │ - Fallback Resilience │ │ - Audio chime │
└───────────────────────────┘        └───────────────────────┘ └───────────────┘
```

### Key Architectural Choices:
1. **Next.js 16 App Router**: Server Components for static shells and secure backend API routes; Client Components for real-time interactive widgets (ticket messaging, notification dropdown, filters).
2. **MongoDB with Mongoose**: Document-oriented data modeling ideal for tickets with embedded subdocuments (`messages[]`, `internal_notes[]`, `ai_tokens_used`).
3. **Dedicated Socket.IO Server (`app/server/socket-server.ts`)**: Provides bi-directional WebSockets on port 4001 syncing ticket replies and notifications with a 6-second polling fallback.
4. **Resilient AI Subsystem (`app/lib/ai/`)**: Isolates Gemini integration into distinct, testable modules (`retry.ts`, `knowledgeBase.ts`, `classfyTicket.ts`, `draftResponse.ts`).

---

## 🤖 4. AI Integration Quality (25% Weight)

### 4.1 Model Choice Justification: Gemini 2.5 Flash
We chose **Google Gemini 2.5 Flash** (via the official `@google/genai` SDK) for the following reasons:
* **Cost Efficiency**: At ~$0.075 per 1M input tokens, Gemini Flash is over 5x more affordable than GPT-4o while maintaining high reasoning quality for customer support.
* **Sub-Second Latency**: Essential for interactive author triage and on-the-fly draft generation without blocking support agents.
* **Structured JSON Mode**: Native support for strict JSON schema output (`responseMimeType: "application/json"`) ensures valid classification categories and confidence scores without JSON parsing crashes.
* **Large Context Window (1M Tokens)**: Provides headroom if extensive manuscript excerpts need to be referenced in future iterations.

---

### 4.2 Prompt Engineering & Tone Calibration
Prompts are grounded in BookLeaf's author communication guidelines:
* **Empathetic & Collaborative**: Authors are addressed as creative partners, never as tickets to be processed.
* **Specific & Actionable**: Prohibits vague promises like "we will look into it soon." Prompts instruct the model to provide concrete timelines:
  - Royalty payouts: 45-day window following quarterly calculation.
  - ISBN linkages: Escalation to production with a strict 48-hour resolution window.
  - Print defects: 5–7 business days turnaround for free reprints upon receiving photo proof.
  - Distribution: 24–48 hours for stock catalog re-synchronization.
* **Self-Contained System Prompts**: Prompts enforce role restrictions and prevent corporate deflection or hallucination of policies not present in the Knowledge Base.

---

### 4.3 Knowledge Base Grounding & Policy Alignment

The AI engine accurately reflects BookLeaf's operational policies:

| Category | Policy Grounding | SLA / Standard Operating Procedure |
| :--- | :--- | :--- |
| **Royalty & Payments** | 80/20 net profit split (80% author / 20% BookLeaf). Calculated as MRP minus printing cost, platform commission, and shipping. | Calculated quarterly; paid within 45 days of quarter end. ₹1,000 threshold (unreached balances roll over). |
| **ISBN & Metadata Issues** | Unique ISBN assigned per book under BookLeaf publisher imprint (or author independent imprint). Duplicate or mismatched listings treated as high priority. | Immediate escalation to production; 48-hour resolution SLA. |
| **Printing & Quality** | Covers misprints, binding separation, color defects, or trimmed text. | Free reprint within 5–7 business days upon author providing photo verification. |
| **Distribution & Availability** | Catalog listing across Amazon India, Flipkart, Amazon US/UK, and BookLeaf Store. "Unavailable" indicates catalog sync lag. | Catalog stock re-sync triggered with distributor within 24–48 hours. |
| **Book Status & Production** | 9-stage pipeline: Manuscript → Editing → Cover Design → Typesetting → Proofreading → ISBN → Printing → Distribution → Live. | Author proof review delays identified collaboratively without blaming authors. |
| **General Inquiry** | Account updates, author bio modifications, and general publishing package queries. | Changes reflected across platforms within 3–5 business days. |

---

### 4.4 Error Handling & Graceful Degradation
Even when the Gemini API is down, rate-limited, timing out, or unconfigured, **ticket submission and portal operations never fail**:

1. **Persistence Guarantee**: If `classifyTicket` throws an exception, the ticket is still saved to MongoDB with:
   - `ai_classification_status: "failed"`
   - `category: "General Inquiry"` (sensible default)
   - `priority: "Medium"` (safe triage default)
   - `ai_confidence_score: null`
   - `ai_error: "AI classification was unavailable at ticket creation. Default fallback applied."`
2. **Bounded Exponential Backoff with Jitter (`app/lib/ai/retry.ts`)**:
   - Classifies errors into **retryable** (HTTP 429, 500, 502, 503, 504, `ECONNRESET`, timeouts) vs **permanent** (HTTP 400, 401, 403, 404, invalid keys).
   - Permanent errors fail immediately without wasting compute or hanging threads.
   - Respects HTTP `Retry-After` headers if returned by Google.
   - Max 2 retries with jitter and a 3,000ms delay ceiling.
3. **Secret Sanitization**:
   - `sanitizeErrorMessage()` automatically redacts Google API keys (`AIza...`), Bearer tokens, and database URIs from error logs and client responses.
4. **Manual Admin Override**:
   - Admins can override AI categories or priorities at any time via one-click dropdowns.
   - If AI draft generation fails, an inline badge alerts the admin while keeping the manual reply box fully editable.

---

### 4.5 Cost Awareness & Token Optimization
We implemented multiple strategies to minimize API costs:

1. **Targeted Knowledge Base Slicing (~70% Token Reduction)**:
   - Rather than injecting the entire monolithic 6KB knowledge base into every prompt, `app/lib/ai/knowledgeBase.ts` provides `getRelevantKnowledgeBase(category)`.
   - A royalty ticket receives *only* royalty policies; an ISBN ticket receives *only* ISBN escalation rules.
2. **In-Database AI Draft Caching**:
   - Generated AI response drafts are persisted in `ticket.ai_draft_response` in MongoDB.
   - Opening, viewing, or refreshing a ticket detail page reads from MongoDB and **never** makes repeated calls to Gemini.
   - Admins can explicitly click "Regenerate" (`forceRegenerate: true`) if they want a fresh draft.
3. **Sliding Window & Truncation**:
   - Conversation history sent to Gemini is restricted to the **last 5 messages**.
   - Individual messages are truncated to **500 characters** in the prompt to prevent prompt bloat and token exhaustion attacks.
4. **Strict Output Token Caps**:
   - Ticket Classification: `maxOutputTokens: 250`, temperature `0.1`.
   - Draft Generation: `maxOutputTokens: 600`, temperature `0.3`.
5. **Usage Tracking**:
   - Prompt tokens, completion tokens, and total tokens from `response.usageMetadata` are stored on the ticket document for cost audits.

---

## 📡 5. Complete REST API Documentation

All API routes follow RESTful conventions, enforce input validation via Zod, and return consistent JSON structures.

### Authentication Endpoints
* **`POST /api/auth/login`**: Authenticates user via email/password. Sets HTTP-only secure cookie and returns `{ success: true, token, user }`.
* **`POST /api/auth/signup`**: Registers a new author and links their profile.
* **`GET /api/auth/me`**: Returns the current user's profile and active session role.

### Ticket Lifecycle Endpoints
* **`GET /api/tickets`**:
  - *Author Role*: Returns only tickets created by the authenticated author (`author_email`).
  - *Admin Role*: Returns all tickets across all authors with full internal metadata.
* **`POST /api/tickets`**:
  - *Access*: Author only.
  - *Payload*: `{ subject, message, book_id?, category? }`.
  - *Behavior*: Validates ownership of `book_id`, runs Gemini classification with fallback, and emits real-time event.
* **`GET /api/tickets/[id]`**: Returns ticket details, messages thread, and internal notes (if admin).
* **`POST /api/tickets/[id]/messages`**:
  - *Access*: Author or Admin.
  - *Payload*: `{ message: string }`.
  - *Behavior*: Appends message to thread and broadcasts `message:new` event via Socket.IO.

### Admin Operations Endpoints
* **`PATCH /api/admin/tickets/[id]`**:
  - *Access*: Admin only.
  - *Payload*: `{ status?, priority?, category?, assigned_to? }`.
  - *Behavior*: Overrides AI priority/category, reassigns staff, or marks ticket `Resolved`/`Closed`.
* **`POST /api/admin/tickets/[id]/draft`**:
  - *Access*: Admin only.
  - *Payload*: `{ forceRegenerate?: boolean }`.
  - *Behavior*: Returns cached MongoDB draft or queries Gemini using category-targeted policies.
* **`POST /api/admin/tickets/[id]/notes`**:
  - *Access*: Admin only.
  - *Payload*: `{ note: string }`.
  - *Behavior*: Adds an internal staff note (excluded from author view).

### Author Catalog Endpoints
* **`GET /api/author/books`**: Returns published books with royalty breakdown for the logged-in author.
* **`GET /api/author/dashboard`**: Aggregates total books, copies sold, royalty earned, and royalty pending.

---

## 🔔 6. Real-Time Notification Engine

The portal provides an instant notification system:
1. **Interactive Notification Bell (`NotificationBell.tsx`)**:
   - Positioned in headers across Author Dashboard, Books, Tickets, and Admin portals.
   - Features an animated pinging badge with unread count.
   - Clicking opens a popover showing recent message previews, timestamps, direct ticket navigation, and "Mark read" controls.
2. **Dual-Transport Synchronization**:
   - Primary: Socket.IO WebSocket events (`message:new`, `ticket:new`).
   - Fallback: 6-second polling loop ensuring continuous updates even in restricted network environments.
   - Multi-Tab Sync: `localStorage` event broadcasting synchronizes unread badges across open browser tabs.
3. **High-Contrast Readability**:
   - Sonner toast notifications and bell dropdowns use deep gray text (`#374151`) on clean white backgrounds for optimal legibility.
   - Soft audio chimes play on incoming messages.

---

## 🎯 7. Edge Cases & Product Thinking

1. **Books in Production & Zero Royalties**:
   - Handled gracefully in `My Books` with visual milestone chips (e.g. *Typesetting*, *Proofreading*) and informative empty states when no royalties have accrued yet.
2. **Pending Royalty Rollover**:
   - Accurately conveys whether accumulated royalties meet the ₹1,000 threshold or roll over to the next quarter.
3. **Data Isolation (RBAC)**:
   - Authors can never access another author's tickets or books; database queries are scoped by `author_email` on the server.
   - Internal notes are filtered out of author responses at the Mongoose query level (`-internal_notes`).
4. **Hydration & Browser Extension Resilience**:
   - `suppressHydrationWarning` on `<html>` and `<body>` prevents React hydration mismatch errors caused by third-party extensions (e.g. Night Eye, Dark Reader).
5. **Next.js 16 Dynamic Component Compatibility**:
   - Uses `await connection()` from `next/server` to defer auth checks to request time without breaking `cacheComponents`.

---

## 💻 8. Local Installation & Setup Guide

### Prerequisites
* **Node.js** v20.0.0 or higher
* **MongoDB** (Atlas connection string or local instance)
* **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install
```bash
git clone <repository-url>
cd my-app
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# MongoDB Atlas Database
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/bookleaf?retryWrites=true&w=majority"

# Authentication Secret
JWT_SECRET="bookleaf-super-secure-jwt-secret-key-2026"

# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-2.5-flash"

# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Real-Time Socket.IO Server
SOCKET_PORT=4001
NEXT_PUBLIC_SOCKET_URL="http://localhost:4001"
SOCKET_INTERNAL_SECRET="bookleaf-socket-secret-key-2026"
```

### 3. Run the Development Servers
In your primary terminal, start Next.js:
```bash
npm run dev
```

In a second terminal, start the Socket.IO real-time notification engine:
```bash
npm run socket
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 9. Automated Test Suite

Run the automated resilience and cost-awareness test suite:
```bash
npm test
```

### Test Coverage (`tests/ai-resilience.test.ts`):
* **Suite 1: AI Error Handling & Graceful Degradation**
  - Identifies retryable errors (HTTP 429, 500, 502, 503, 504, timeout, network failure).
  - Rejects permanent client errors (HTTP 400, 401, 403, 404, invalid keys).
  - Parses and bounds `Retry-After` headers accurately.
  - Sanitizes error strings to redact API keys and Bearer tokens.
  - Verifies exponential backoff with jitter and retry limit bounds.
* **Suite 2: AI Cost Awareness & Token Optimization**
  - Confirms category-specific policy routing achieves ~70% token savings over monolithic knowledge base.
  - Enforces enum boundaries on categories and priorities.
  - Verifies graceful degradation fallback persistence when AI classification is down.
  - Validates cached AI draft reuse preventing duplicate Gemini calls.
* **Suite 3: BookLeaf Business Rules**
  - Asserts consistency of 80/20 royalty split, ₹1,000 threshold, 45-day payment cycles, 48h ISBN SLA, and free reprints.

---

## 📝 10. Architectural Write-Up

### Approach & Priorities
When building the BookLeaf Portal, I prioritized **operational reliability and real-world utility over cosmetic complexity**. Support ticketing systems succeed or fail based on response speed, clarity of data, and zero message loss. 

My top three development priorities were:
1. **Unbreakable Ticket Pipeline**: Guaranteeing that author tickets are saved even during AI outages, network hiccups, or rate limits.
2. **Actionable AI Assistance**: Ensuring Gemini produces authentic BookLeaf responses grounded in actual policy (royalties, reprints, ISBNs) rather than generic fluff.
3. **Author Trust & Transparency**: Giving authors instant visibility into their book sales, royalties, and ticket progress in real-time.

### Key Trade-Offs Made
* **Socket.IO Standalone Server vs Serverless WebSockets**: Next.js App Router API routes are stateless and cannot maintain persistent WebSocket connections in standard serverless runtimes. I chose a lightweight companion Socket.IO server (`app/server/socket-server.ts`) with a 6-second polling fallback. This provides true real-time chat with rock-solid fallback reliability.
* **Category Policy Slicing vs Monolithic Vector RAG**: Setting up a full Pinecone/Milvus vector database for a 6KB knowledge base would introduce unnecessary architectural overhead. Instead, I designed a deterministic, category-routed policy retrieval module. This achieved ~70% token savings and zero vector retrieval latency while remaining 100% deterministic.
* **Client UI File Upload Mock**: In line with the assignment guidelines, the file upload input is implemented on the frontend without third-party S3/Blob storage dependencies, keeping local evaluation friction-free.

### Production Evolution Roadmap
If deploying this application to enterprise production at BookLeaf scale (1,200+ monthly books, 22,000+ titles), I would implement:
1. **Cloud Object Storage (AWS S3 / Cloudflare R2)**: For photo proofs of defective book copies and manuscript attachments with virus scanning.
2. **Redis Message Broker**: Replacing the single-node Socket.IO instance with Redis pub/sub to support horizontal auto-scaling across multiple server instances.
3. **Background Job Queue (BullMQ / AWS SQS)**: Moving AI response drafting and automated classification into an asynchronous background queue with Dead Letter Queues (DLQ).
4. **CRM & Distribution Webhooks**: Ingesting real-time inventory webhooks from Amazon KDP and IngramSpark to automate catalog availability tickets without manual author intervention.
