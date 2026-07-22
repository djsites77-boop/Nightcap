import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from "@/generated/prisma/client";
import { resolveAnthropicApiKey } from "@/lib/platform-keys";

/**
 * AI-assisted document field extraction on upload. Proposes type, optional
 * expiry, a short title, and notes. Needs ANTHROPIC_API_KEY — if missing,
 * upload still works with the host's manual fields / filename heuristics.
 */

export type DocumentExtraction = {
  docType: DocumentType;
  label: string | null;
  expiryDate: string | null; // YYYY-MM-DD or null when none / not found
  summary: string | null;
  confidence: "high" | "medium" | "low";
};

const DOC_TYPES = [
  "fire_safety_cert",
  "insurance",
  "floor_plan",
  "registration",
  "receipt",
  "other",
] as const satisfies readonly DocumentType[];

const EXTRACT_DOCUMENT_TOOL: Anthropic.Tool = {
  name: "extract_document_fields",
  description:
    "Classify a short-term rental host document and extract useful fields. Set expiryDate to null when the document has no expiry or none is visible — do not invent dates.",
  input_schema: {
    type: "object",
    properties: {
      docType: {
        type: "string",
        enum: [...DOC_TYPES],
        description: "Best-fit document category",
      },
      label: {
        type: ["string", "null"],
        description:
          "Short host-facing title, e.g. 'Liability insurance' or 'City of Toronto STR licence'. Null if nothing better than the category name.",
      },
      expiryDate: {
        type: ["string", "null"],
        description:
          "ISO date YYYY-MM-DD if an expiry/valid-until/renewal date is clearly stated; otherwise null",
      },
      summary: {
        type: ["string", "null"],
        description: "One short sentence of useful extras (issuer, policy/licence #) or null",
      },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["docType", "label", "expiryDate", "summary", "confidence"],
  },
};

export async function isDocumentAiEnabled(): Promise<boolean> {
  return Boolean(await resolveAnthropicApiKey());
}

export async function extractDocumentFields(
  fileBase64: string,
  mimeType: string,
  fileName: string
): Promise<DocumentExtraction | null> {
  const apiKey = await resolveAnthropicApiKey();
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const content: Anthropic.ContentBlockParam[] = [];

  if (mimeType.startsWith("image/")) {
    const mediaType = normalizeImageType(mimeType);
    if (!mediaType) return null;
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: fileBase64 },
    });
  } else if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
    });
  } else {
    return null;
  }

  content.push({
    type: "text",
    text: `This file is named "${fileName}". Classify it for a Canadian short-term rental host compliance vault (registration/licence, insurance, fire safety certificate, floor plan, receipt, or other). Extract expiry only if clearly present.`,
  });

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 640,
      tools: [EXTRACT_DOCUMENT_TOOL],
      tool_choice: { type: "tool", name: "extract_document_fields" },
      messages: [{ role: "user", content }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const input = toolUse.input as DocumentExtraction;
    if (!DOC_TYPES.includes(input.docType)) {
      input.docType = "other";
    }
    if (input.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) {
      input.expiryDate = null;
    }
    return input;
  } catch {
    return null;
  }
}

function normalizeImageType(
  mimeType: string
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (mimeType === "image/jpg") return "image/jpeg";
  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  ) {
    return mimeType;
  }
  return null;
}
