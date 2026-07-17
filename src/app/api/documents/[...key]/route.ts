import { NextRequest, NextResponse } from "next/server";
import { LocalDocumentStorage, verifyLocalDocumentToken } from "@/lib/storage/local-driver";

/**
 * Serves locally-stored documents through a short-lived signed URL (spec
 * §12) — this route is the dev-mode stand-in for an S3 presigned URL. It
 * only checks the signature/expiry, not the caller's session, because by the
 * time a URL reaches here the ownership check already happened once, when
 * the signed URL was minted (see app/actions/documents.ts) — the signature
 * itself is the access control from that point on, same as a real presigned
 * URL.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await context.params;
  const key = keyParts.join("/");

  const expiresParam = request.nextUrl.searchParams.get("expires");
  const token = request.nextUrl.searchParams.get("token");

  if (!expiresParam || !token) {
    return NextResponse.json({ error: "Missing signed URL parameters" }, { status: 400 });
  }

  const expiresAt = Number(expiresParam);
  if (!Number.isFinite(expiresAt) || !verifyLocalDocumentToken(key, expiresAt, token)) {
    return NextResponse.json({ error: "Signed URL is invalid or expired" }, { status: 403 });
  }

  const storage = new LocalDocumentStorage();
  try {
    const data = await storage.read(key);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
