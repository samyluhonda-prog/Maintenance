import { describe, expect, it } from "vitest";

import { locationSchema } from "@/lib/validation/locations";

describe("locationSchema", () => {
  it("parses a valid payload", () => {
    const result = locationSchema.parse({ type: "site", name: "Centre de tri Nordique" });
    expect(result).toMatchObject({ type: "site", name: "Centre de tri Nordique" });
  });

  it("rejects a missing required name", () => {
    expect(locationSchema.safeParse({ type: "site" }).success).toBe(false);
  });

  it("rejects an invalid type enum value", () => {
    expect(locationSchema.safeParse({ type: "planet", name: "Mars" }).success).toBe(false);
  });

  it("accepts an empty-string code/address/notes (the FormValues escape hatch)", () => {
    const result = locationSchema.parse({ type: "zone", name: "Zone A", code: "", address: "", notes: "" });
    expect(result.code).toBe("");
  });

  it("rejects a name over the max length", () => {
    expect(locationSchema.safeParse({ type: "zone", name: "x".repeat(201) }).success).toBe(false);
  });
});
