import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed OAuth `state` parameter: binds the callback back to the user who
 * started the flow and guards against CSRF, without needing server-side
 * session storage for the OAuth handshake itself.
 */
function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return secret;
}

export function signPmsState(userId: string): string {
  const nonce = Date.now().toString(36);
  const payload = `${userId}.${nonce}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyPmsState(state: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [userId, nonce, sig] = decoded.split(".");
    if (!userId || !nonce || !sig) return null;

    const expectedSig = createHmac("sha256", getSecret()).update(`${userId}.${nonce}`).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { userId };
  } catch {
    return null;
  }
}
