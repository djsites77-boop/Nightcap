import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from "@/generated/prisma/client";

/**
 * AI-assisted receipt extraction for expenses (Nightcap).
 * Suggests fields for host review — nothing is saved until they submit.
 */

export const EXPENSE_CATEGORIES = [
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

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORIES)[number];

export const INVENTORY_CATEGORIES = [
  "appliance",
  "furniture",
  "electronics",
  "linens_bedding",
  "kitchenware",
  "safety_equipment",
  "outdoor",
  "other",
] as const;

export type ReceiptSuggestion = {
  vendorName: string | null;
  incurredOn: string | null;
  totalAmountCents: number | null;
  suggestedCategory: ExpenseCategoryCode | null;
  description: string | null;
  suggestedTags: string[];
  warrantyExpiryDate: string | null;
  isInventoryPurchase: boolean;
  inventoryName: string | null;
  inventoryCategory: (typeof INVENTORY_CATEGORIES)[number] | null;
  brand: string | null;
  model: string | null;
  confidence: "high" | "medium" | "low";
  summary: string | null;
};

const EXTRACT_RECEIPT_TOOL: Anthropic.Tool = {
  name: "extract_receipt_fields",
  description:
    "Extract expense fields from a short-term rental host receipt. Set unknown fields to null. Never invent warranty dates.",
  input_schema: {
    type: "object",
    properties: {
      vendorName: { type: ["string", "null"] },
      incurredOn: {
        type: ["string", "null"],
        description: "YYYY-MM-DD receipt date",
      },
      totalAmountCents: {
        type: ["integer", "null"],
        description: "Final total in cents",
      },
      suggestedCategory: {
        type: ["string", "null"],
        enum: [...EXPENSE_CATEGORIES, null],
      },
      description: {
        type: ["string", "null"],
        description: "Short expense description for the host ledger",
      },
      suggestedTags: {
        type: "array",
        items: { type: "string" },
        description:
          "3–8 searchable tags: vendor, month/year, category words, product type — not vague words like 'shopping'",
      },
      warrantyExpiryDate: {
        type: ["string", "null"],
        description: "YYYY-MM-DD if warranty or return-by date is printed; else null",
      },
      isInventoryPurchase: {
        type: "boolean",
        description: "True if this looks like a durable good for the property (appliance, furniture, electronics, etc.)",
      },
      inventoryName: {
        type: ["string", "null"],
        description: "Suggested inventory item name when isInventoryPurchase is true",
      },
      inventoryCategory: {
        type: ["string", "null"],
        enum: [...INVENTORY_CATEGORIES, null],
      },
      brand: { type: ["string", "null"] },
      model: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      summary: {
        type: ["string", "null"],
        description: "One sentence of useful extras (payment method, receipt #)",
      },
    },
    required: [
      "vendorName",
      "incurredOn",
      "totalAmountCents",
      "suggestedCategory",
      "description",
      "suggestedTags",
      "warrantyExpiryDate",
      "isInventoryPurchase",
      "inventoryName",
      "inventoryCategory",
      "brand",
      "model",
      "confidence",
      "summary",
    ],
  },
};

export async function suggestReceiptFields(
  fileBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
  context?: { propertyNickname?: string; address?: string }
): Promise<ReceiptSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured — add it to .env to enable AI-assisted receipt scanning."
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const content: Anthropic.ContentBlockParam[] =
    mediaType === "application/pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
          },
        ]
      : [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: fileBase64 },
          },
        ];

  const ctxBits = [
    context?.propertyNickname ? `Listing: ${context.propertyNickname}` : null,
    context?.address ? `Address: ${context.address}` : null,
  ].filter(Boolean);

  content.push({
    type: "text",
    text: `Extract this Canadian short-term rental host expense receipt.${
      ctxBits.length ? ` Context — ${ctxBits.join("; ")}.` : ""
    } Prefer specific tags (vendor, month year, product). Include warrantyExpiryDate only if printed.`,
  });

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [EXTRACT_RECEIPT_TOOL],
    tool_choice: { type: "tool", name: "extract_receipt_fields" },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("The model didn't return a structured suggestion — try a clearer photo.");
  }

  const raw = toolUse.input as ReceiptSuggestion;
  if (raw.warrantyExpiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(raw.warrantyExpiryDate)) {
    raw.warrantyExpiryDate = null;
  }
  if (raw.incurredOn && !/^\d{4}-\d{2}-\d{2}$/.test(raw.incurredOn)) {
    raw.incurredOn = null;
  }
  if (!Array.isArray(raw.suggestedTags)) raw.suggestedTags = [];
  raw.suggestedTags = raw.suggestedTags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12);

  return raw;
}

/** Keep DocumentType import used if needed by callers — re-export for convenience. */
export type { DocumentType };
