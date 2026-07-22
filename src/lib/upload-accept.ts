/** Shared upload accept strings — safe for client + server imports. */

/** Browser `accept` for compliance / listing documents. */
export const DOCUMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.csv,.doc,.docx,.xls,.xlsx,application/pdf,image/*,text/csv";

/** Receipts / AI scan — images + PDF only. */
export const RECEIPT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/jpeg,image/png,image/webp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
