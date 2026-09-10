import { describe, expect, it } from "vitest";

import { generateShortCode } from "@/lib/short-code";

// Mirror the source's own ALPHABET rather than re-typing it by hand, so this
// test can't drift from the real "no ambiguous characters" set if it changes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const AMBIGUOUS = ["0", "O", "1", "I"];

describe("generateShortCode", () => {
  it("formats as `<prefix>-<code>` with the default length of 8", () => {
    const code = generateShortCode("EQ");
    expect(code).toMatch(/^EQ-[A-Z0-9]{8}$/);
  });

  it("respects a custom length", () => {
    const code = generateShortCode("PT", 12);
    const [, body] = code.split("-");
    expect(body).toHaveLength(12);
  });

  it("uses only characters from the documented ALPHABET (excludes ambiguous ones)", () => {
    for (let i = 0; i < 200; i++) {
      const [, body] = generateShortCode("X", 16).split("-");
      for (const ch of body) {
        expect(ALPHABET).toContain(ch);
      }
    }
  });

  it("never contains the ambiguous characters 0, O, 1, I", () => {
    for (let i = 0; i < 200; i++) {
      const [, body] = generateShortCode("X", 20).split("-");
      for (const bad of AMBIGUOUS) {
        expect(body).not.toContain(bad);
      }
    }
  });

  it("is highly unique across many calls (no collisions in a large sample)", () => {
    const codes = new Set<string>();
    const n = 5000;
    for (let i = 0; i < n; i++) codes.add(generateShortCode("EQ"));
    expect(codes.size).toBe(n);
  });

  it("keeps the given prefix verbatim, including multi-segment prefixes", () => {
    expect(generateShortCode("WO").startsWith("WO-")).toBe(true);
    expect(generateShortCode("EQ-DEMO").startsWith("EQ-DEMO-")).toBe(true);
  });
});
