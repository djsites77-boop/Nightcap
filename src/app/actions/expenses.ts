"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getDocumentStorage, buildDocumentStorageKey } from "@/lib/storage";
import {
  EXPENSE_CATEGORIES,
  INVENTORY_CATEGORIES,
  suggestReceiptFields,
  type ReceiptSuggestion,
} from "@/lib/receipt-parsing";

const TAG_COLORS = [
  "#e8a017",
  "#3B82F6",
  "#16a34a",
  "#e5484d",
  "#8b5cf6",
  "#0ea5e9",
  "#f97316",
  "#64748b",
];

async function assertOwnsProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== userId) throw new Error("Not authorized");
  return property;
}

async function ensureTags(userId: string, names: string[]) {
  const cleaned = [
    ...new Set(
      names
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && n.length <= 48)
        .slice(0, 12)
    ),
  ];
  const tags = [];
  for (let i = 0; i < cleaned.length; i++) {
    const name = cleaned[i]!;
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, color: TAG_COLORS[i % TAG_COLORS.length] },
      update: {},
    });
    tags.push(tag);
  }
  return tags;
}

const createExpenseSchema = z.object({
  propertyId: z.string().optional(), // empty / "general" → null
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().positive(),
  incurredOn: z.string().min(1),
  vendorName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  warrantyExpiryDate: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  addToInventory: z.enum(["true", "false"]).optional(),
  inventoryName: z.string().max(200).optional(),
  inventoryCategory: z.enum(INVENTORY_CATEGORIES).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
});

/** Creates an expense (+ optional receipt Document, tags, inventory item). */
export async function createExpense(formData: FormData) {
  const session = await requireSession();
  const rawPropertyId = String(formData.get("propertyId") ?? "").trim();
  const propertyId =
    !rawPropertyId || rawPropertyId === "general" ? undefined : rawPropertyId;

  const parsed = createExpenseSchema.safeParse({
    propertyId,
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    incurredOn: formData.get("incurredOn"),
    vendorName: formData.get("vendorName") || undefined,
    notes: formData.get("notes") || undefined,
    warrantyExpiryDate: formData.get("warrantyExpiryDate") || undefined,
    tags: formData.get("tags") || undefined,
    addToInventory: formData.get("addToInventory") === "true" ? "true" : "false",
    inventoryName: formData.get("inventoryName") || undefined,
    inventoryCategory: formData.get("inventoryCategory") || undefined,
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  if (parsed.data.propertyId) {
    await assertOwnsProperty(parsed.data.propertyId, session.user.id);
  }

  const wantInventory = parsed.data.addToInventory === "true";
  if (wantInventory && !parsed.data.propertyId) {
    throw new Error("Pick a listing to add this purchase to inventory.");
  }

  let receiptDocumentId: string | null = null;
  const file = formData.get("receipt");
  const warrantyDate = parsed.data.warrantyExpiryDate
    ? new Date(`${parsed.data.warrantyExpiryDate}T00:00:00Z`)
    : null;

  if (file instanceof File && file.size > 0) {
    const { assertSafeUpload } = await import("@/lib/safe-upload");
    const safe = await assertSafeUpload(file);
    const doc = await prisma.document.create({
      data: {
        propertyId: parsed.data.propertyId ?? null,
        docType: "receipt",
        label: parsed.data.vendorName
          ? `Receipt — ${parsed.data.vendorName}`
          : "Receipt",
        aiSummary: parsed.data.notes || null,
        fileName: safe.fileName,
        storageKey: "",
        mimeType: safe.mimeType,
        sizeBytes: safe.sizeBytes,
        expiryDate: warrantyDate,
      },
    });
    const key = buildDocumentStorageKey(
      parsed.data.propertyId ?? session.user.id,
      doc.id,
      doc.fileName
    );
    await getDocumentStorage().put(key, safe.buffer, safe.mimeType);
    await prisma.document.update({ where: { id: doc.id }, data: { storageKey: key } });
    receiptDocumentId = doc.id;
  }

  const tagNames = (parsed.data.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tags = await ensureTags(session.user.id, tagNames);

  const expense = await prisma.expense.create({
    data: {
      userId: session.user.id,
      propertyId: parsed.data.propertyId ?? null,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: Math.round(parsed.data.amount * 100),
      incurredOn: new Date(`${parsed.data.incurredOn}T00:00:00Z`),
      vendorName: parsed.data.vendorName || null,
      notes: parsed.data.notes || null,
      warrantyExpiryDate: wantInventory ? null : warrantyDate,
      receiptDocumentId,
      tags: {
        create: tags.map((t) => ({ tagId: t.id })),
      },
    },
  });

  if (wantInventory && parsed.data.propertyId) {
    await prisma.inventoryAsset.create({
      data: {
        propertyId: parsed.data.propertyId,
        name: parsed.data.inventoryName?.trim() || parsed.data.description.slice(0, 200),
        category: parsed.data.inventoryCategory ?? "other",
        brand: parsed.data.brand || null,
        model: parsed.data.model || null,
        purchaseDate: new Date(`${parsed.data.incurredOn}T00:00:00Z`),
        purchasePriceCents: Math.round(parsed.data.amount * 100),
        warrantyExpiryDate: warrantyDate,
        purchaseExpenseId: expense.id,
        purchaseDocumentId: receiptDocumentId,
        notes: parsed.data.notes || null,
      },
    });
  }

  if (parsed.data.propertyId) {
    revalidatePath(`/properties/${parsed.data.propertyId}`);
  }
  revalidatePath("/documents");
}

export async function deleteExpense(expenseId: string) {
  const session = await requireSession();
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  if (expense.userId !== session.user.id) throw new Error("Not authorized");

  await prisma.expense.delete({ where: { id: expenseId } });
  if (expense.receiptDocumentId) {
    const doc = await prisma.document.findUnique({ where: { id: expense.receiptDocumentId } });
    if (doc) {
      await getDocumentStorage().delete(doc.storageKey).catch(() => {});
      await prisma.document.delete({ where: { id: doc.id } });
    }
  }

  if (expense.propertyId) revalidatePath(`/properties/${expense.propertyId}`);
}

export async function suggestExpenseFromReceipt(formData: FormData): Promise<ReceiptSuggestion> {
  const session = await requireSession();

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a receipt first.");

  const { assertSafeUpload } = await import("@/lib/safe-upload");
  const safe = await assertSafeUpload(file);
  if (!["pdf", "png", "jpeg", "webp"].includes(safe.kind)) {
    throw new Error("Use a JPEG, PNG, WebP, or PDF receipt for AI scan.");
  }

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  let context: { propertyNickname?: string; address?: string } | undefined;
  if (propertyId && propertyId !== "general") {
    const property = await assertOwnsProperty(propertyId, session.user.id);
    context = { propertyNickname: property.nickname, address: property.address };
  }

  const mediaType = (
    safe.kind === "pdf"
      ? "application/pdf"
      : safe.mimeType
  ) as "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

  return suggestReceiptFields(safe.buffer.toString("base64"), mediaType, context);
}

/** CSV export of a property's expenses for handing to an accountant. */
export async function getExpensesCsv(propertyId: string, year?: number): Promise<string> {
  const session = await requireSession();
  await assertOwnsProperty(propertyId, session.user.id);

  const where = year
    ? {
        propertyId,
        incurredOn: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      }
    : { propertyId };

  const expenses = await prisma.expense.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { incurredOn: "asc" },
  });

  const rows = [
    ["Date", "Category", "Description", "Vendor", "Amount (CAD)", "Tags", "Warranty", "Has receipt"],
    ...expenses.map((e) => [
      e.incurredOn.toISOString().slice(0, 10),
      e.category,
      e.description,
      e.vendorName ?? "",
      (e.amountCents / 100).toFixed(2),
      e.tags.map((t) => t.tag.name).join("; "),
      e.warrantyExpiryDate ? e.warrantyExpiryDate.toISOString().slice(0, 10) : "",
      e.receiptDocumentId ? "yes" : "no",
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
