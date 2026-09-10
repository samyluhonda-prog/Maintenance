import { describe, expect, it } from "vitest";

import { supplierDocumentSchema, supplierSchema } from "@/lib/validation/suppliers";

describe("supplierSchema", () => {
  it("parses a valid payload", () => {
    const result = supplierSchema.parse({ name: "Pièces Industrielles Laurentides" });
    expect(result.name).toBe("Pièces Industrielles Laurentides");
  });

  it("rejects a missing required name", () => {
    expect(supplierSchema.safeParse({ email: "x@example.com" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(supplierSchema.safeParse({ name: "X", email: "not-an-email" }).success).toBe(false);
  });

  it("coerces rating from a form string and enforces the 0-5 range", () => {
    const result = supplierSchema.parse({ name: "X", rating: "4" });
    expect(result.rating).toBe(4);
    expect(supplierSchema.safeParse({ name: "X", rating: "6" }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "X", rating: "-1" }).success).toBe(false);
  });
});

describe("supplierDocumentSchema", () => {
  it("parses a valid payload", () => {
    const result = supplierDocumentSchema.parse({ title: "Contrat annuel", kind: "contract" });
    expect(result.kind).toBe("contract");
  });

  it("rejects an invalid kind enum value", () => {
    expect(supplierDocumentSchema.safeParse({ title: "X", kind: "invoice" }).success).toBe(false);
  });

  it("coerces value from a form string", () => {
    const result = supplierDocumentSchema.parse({ title: "X", kind: "document", value: "1000" });
    expect(result.value).toBe(1000);
  });
});
