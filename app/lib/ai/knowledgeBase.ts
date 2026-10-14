/**
 * BookLeaf Publishing - Official Support Knowledge Base
 * Segmented for token-efficient, category-specific context injection.
 */

export const COMPANY_OVERVIEW = `
# BOOKLEAF OVERVIEW
- BookLeaf Publishing is an author-first self-publishing platform in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium distribution/marketing).
- Facilities: Delhi printing & warehouse facility with print partners Repro India and Epitome Books.
`;

export const COMMUNICATION_TONE = `
# COMMUNICATION TONE & RESPONSE GUIDELINES
- Address the author politely by name ("Dear [Author Name]," or "Hello [Author Name],").
- Authors are partners, not customers to manage. Acknowledge concerns directly with empathy before proposing solutions.
- If an issue is BookLeaf's responsibility, own it transparently without corporate deflection.
- Give concrete timelines (e.g., "within 48 hours" or "5–7 business days") rather than vague promises.
- Never invent facts or dates unsupported by the ticket. Sign off warmly as "BookLeaf Support Team".
`;

export const CATEGORY_POLICIES: Record<string, string> = {
  "Royalty & Payments": `
# POLICY: ROYALTY & PAYMENTS
- Royalty Split: 80/20 net profit split (80% to author, 20% to BookLeaf).
- Net Profit Formula: MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
- Payout Schedule: Calculated quarterly, paid within 45 days after the quarter closes.
- Minimum Threshold: ₹1,000. Balances below ₹1,000 roll over automatically to the following quarter.
- Mode: Direct bank transfer to the account linked in the author's portal dashboard.
- Guideline: Acknowledge financial concerns transparently. If payments are overdue, escalate with a strict 48-hour resolution timeline. Offer a line-by-line sales breakdown.
`,

  "ISBN & Metadata Issues": `
# POLICY: ISBN & METADATA
- ISBN Assignment: Every published book receives a distinct ISBN registered under BookLeaf's publisher imprint.
- Independent ISBNs: Authors wishing to use personal imprints must provide their own registered ISBN.
- Defect Protocol: Duplicate ISBN, missing metadata, or wrong title/author linkage is high-priority.
- Resolution Timeline: Escalate immediately to the production team with a clear 48-hour resolution timeline.
`,

  "Printing & Quality": `
# POLICY: PRINTING & QUALITY
- Print Partners & Facility: In-house Delhi printing with overflow to Repro India / Epitome Books.
- Standard Turnaround: 5–7 business days from order confirmation.
- Defect Policy: Covers blurry text, misprints, binding separation, or trimming errors.
- Action: Sincere apology, request clear photos of the defect, confirm a 100% free reprint within 5–7 business days once verified.
`,

  "Distribution & Availability": `
# POLICY: DISTRIBUTION & AVAILABILITY
- Live Channels: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- Listing Timeline: New book listings take 7–10 business days after publication completes.
- "Currently Unavailable" Status: Usually indicates an automated catalog stock sync glitch.
- Action: Trigger an inventory re-sync with distribution partners within 24–48 hours for the listing to go live again.
`,

  "Book Status & Production Updates": `
# POLICY: PRODUCTION & BOOK STATUS
- Stages: Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Live.
- Common Delays: Author approval rounds on Cover Design and Typesetting proofs.
- Action: Give an honest, transparent status update. Frame delays collaboratively without shifting blame onto the author.
`,

  "General Inquiry": `
# POLICY: GENERAL INQUIRIES & METADATA
- Metadata Changes: Description, author bio, or category updates can be requested through the dashboard.
- Timeline: Store updates reflect on external retail channels within 3–5 business days.
- Support Scope: Provide clear, friendly guidance on navigating the dashboard or updating account details.
`,
};

/**
 * Returns a targeted knowledge base snippet specific to the ticket's category.
 * This cuts prompt token consumption by ~70% compared to sending the entire knowledge base.
 */
export function getRelevantKnowledgeBase(category?: string | null): string {
  const selectedCategory = category && CATEGORY_POLICIES[category] ? category : "General Inquiry";
  const policy = CATEGORY_POLICIES[selectedCategory];

  return `
${COMPANY_OVERVIEW}
${policy}
${COMMUNICATION_TONE}
`.trim();
}

/**
 * Full Knowledge Base export for backward compatibility.
 */
export const BOOKLEAF_KNOWLEDGE_BASE = `
${COMPANY_OVERVIEW}

${Object.values(CATEGORY_POLICIES).join("\n")}

${COMMUNICATION_TONE}
`.trim();
