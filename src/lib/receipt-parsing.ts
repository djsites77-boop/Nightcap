import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-assisted receipt field extraction — a data-entry convenience, never an
 * authority. Like rule-extraction.ts, this only ever proposes values for a
 * human to review and edit in the expense form before anything is saved;
 * nothing here writes to the Expense table directly. Needs
 * ANTHROPIC_API_KEY — not configured in this session.
 */

export interface ReceiptSuggestion {
  vendorName: string | null;
  incurredOn: string | null;
  totalAmountCents: number | null;
  suggestedCategory: string | null;
  confidence: "high" | "medium" | "low";
}

const EXPENSE_CATEGORIES = [
  "advertising",
  "insurance",
  "interest_mortgage",
  "professional_fees",
  "management_fees",
  "repairs_maintenance",
  "supplies",
  "property_tax",
  "travel",
  "utilities",
  "cleaning",
  "platform_fees",
  "other",
] as const;

const EXTRACT_RECEIPT_TOOL: Anthropic.Tool = {
  name: "extract_receipt_fields",
  description:
    "Extract the vendor, date, total amount, and likely rental-expense category from a receipt image. If a field isn't legible, set it to null rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      vendorName: { type: ["string", "null"], description: "Store/business name on the receipt" },
      incurredOn: { type: ["string", "null"], description: "ISO 8601 date (YYYY-MM-DD) the receipt is dated, or null" },
      totalAmountCents: {
        type: ["integer", "null"],
        description: "Final total paid, in cents (e.g. $12.50 -> 1250), or null if not legible",
      },
      suggestedCategory: {
        type: ["string", "null"],
        enum: [...EXPENSE_CATEGORIES, null],
        description: "Best-guess rental-expense category based on what was purchased",
      },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["vendorName", "incurredOn", "totalAmountCents", "suggestedCategory", "confidence"],
  },
};

export async function suggestReceiptFields(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ReceiptSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured — add it to .env to enable AI-assisted receipt scanning."
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const message = await client.messages.create({
    model,
    max_tokens: 512,
    tools: [EXTRACT_RECEIPT_TOOL],
    tool_choice: { type: "tool", name: "extract_receipt_fields" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          {
            type: "text",
            text: "Extract this rental-property expense receipt's vendor, date, total amount, and likely expense category.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The model didn't return a structured suggestion — try a clearer photo.");
  }

  return toolUse.input as ReceiptSuggestion;
}
