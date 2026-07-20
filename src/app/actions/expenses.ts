"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getDocumentStorage, buildDocumentStorageKey } from "@/lib/storage";
import { suggestReceiptFields, type ReceiptSuggestion } from "@/lib/receipt-parsing";

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

async function assertOwnsProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== userId) throw new Error("Not authorized");
  return property;
}

const createExpenseSchema = z.object({
  propertyId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().positive(),
  incurredOn: z.string().min(1),
  vendorName: z.string().max(200).optional(),
});

/** Creates an expense, optionally attaching an uploaded receipt as a Document. */
export async function createExpense(formData: FormData) {
  const session = await requireSession();
  const parsed = createExpenseSchema.safeParse({
    propertyId: formData.get("propertyId"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    incurredOn: formData.get("incurredOn"),
    vendorName: formData.get("vendorName") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  await assertOwnsProperty(parsed.data.propertyId, session.user.id);

  let receiptDocumentId: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) throw new Error("Receipt file must be under 8MB.");
    const doc = await prisma.document.create({
      data: {
        propertyId: parsed.data.propertyId,
        docType: "receipt",
        fileName: file.name.slice(0, 180),
        storageKey: "",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
    const key = buildDocumentStorageKey(parsed.data.propertyId, doc.id, doc.fileName);
    const buf = Buffer.from(await file.arrayBuffer());
    await getDocumentStorage().put(key, buf, doc.mimeType);
    await prisma.document.update({ where: { id: doc.id }, data: { storageKey: key } });
    receiptDocumentId = doc.id;
  }

  await prisma.expense.create({
    data: {
      propertyId: parsed.data.propertyId,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: Math.round(parsed.data.amount * 100),
      incurredOn: new Date(`${parsed.data.incurredOn}T00:00:00Z`),
      vendorName: parsed.data.vendorName || null,
      receiptDocumentId,
    },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
}

export async function deleteExpense(expenseId: string) {
  const session = await requireSession();
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  await assertOwnsProperty(expense.propertyId, session.user.id);

  await prisma.expense.delete({ where: { id: expenseId } });
  if (expense.receiptDocumentId) {
    const doc = await prisma.document.findUnique({ where: { id: expense.receiptDocumentId } });
    if (doc) {
      await getDocumentStorage().delete(doc.storageKey).catch(() => {});
      await prisma.document.delete({ where: { id: doc.id } });
    }
  }

  revalidatePath(`/properties/${expense.propertyId}`);
}

/**
 * AI-assists a receipt photo into suggested expense-form field values — the
 * host still has to review and submit the form themselves (see rule-
 * extraction.ts for the same suggestion-only philosophy applied to
 * compliance rules). Nothing is saved by this action.
 */
export async function suggestExpenseFromReceipt(formData: FormData): Promise<ReceiptSuggestion> {
  await requireSession();

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a receipt photo first.");

  const mimeType = file.type;
  const supported = ["image/jpeg", "image/png", "image/webp"] as const;
  if (!supported.includes(mimeType as (typeof supported)[number])) {
    throw new Error("Only JPEG, PNG, or WebP photos are supported for AI scanning.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  return suggestReceiptFields(buf.toString("base64"), mimeType as (typeof supported)[number]);
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

  const expenses = await prisma.expense.findMany({ where, orderBy: { incurredOn: "asc" } });

  const rows = [
    ["Date", "Category", "Description", "Vendor", "Amount (CAD)"],
    ...expenses.map((e) => [
      e.incurredOn.toISOString().slice(0, 10),
      e.category,
      e.description,
      e.vendorName ?? "",
      (e.amountCents / 100).toFixed(2),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
