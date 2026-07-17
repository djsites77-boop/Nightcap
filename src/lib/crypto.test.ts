import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, lastFour } from "./crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const url = "https://www.airbnb.ca/calendar/ical/48213991.ics?s=8f2a1c9d3e91";
    const encrypted = encryptSecret(url);
    expect(encrypted.ciphertext).not.toContain(url);
    expect(decryptSecret(encrypted)).toBe(url);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("fails to decrypt with a tampered ciphertext (authenticity check)", () => {
    const encrypted = encryptSecret("secret-value");
    const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -4) + "AAAA" };
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("lastFour", () => {
  it("returns only the last 4 characters", () => {
    expect(lastFour("abcdefgh3e91")).toBe("3e91");
  });
});
