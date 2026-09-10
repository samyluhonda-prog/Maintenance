import { describe, expect, it } from "vitest";

import { purchaseOrderLineSchema, purchaseOrderSchema } from "@/lib/validation/purchasing";

describe("purchaseOrderLineSchema", () => {
  it("parses a valid line and coerces quantity/unitCost", () => {
    const result = purchaseOrderLineSchema.parse({ description: "Courroie", quantity: "2", unitCost: "145.5" });
    expect(result.quantity).toBe(2);
    expect(result.unitCost).toBe(145.5);
  });

  it("rejects a zero or negative quantity", () => {
    expect(purchaseOrderLineSchema.safeParse({ description: "X", quantity: "0", unitCost: "1" }).success).toBe(false);
  });

  it("rejects a missing description", () => {
    expect(purchaseOrderLineSchema.safeParse({ description: "", quantity: "1", unitCost: "1" }).success).toBe(false);
  });
});

describe("purchaseOrderSchema", () => {
  const validLine = { description: "Courroie", quantity: "2", unitCost: "145" };

  it("parses a valid payload with at least one line", () => {
    const result = purchaseOrderSchema.parse({ tax: "0", shipping: "0", lines: [validLine] });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity).toBe(2);
  });

  it("rejects an empty lines array", () => {
    expect(purchaseOrderSchema.safeParse({ tax: "0", shipping: "0", lines: [] }).success).toBe(false);
  });

  it("rejects a negative tax or shipping", () => {
    expect(purchaseOrderSchema.safeParse({ tax: "-1", shipping: "0", lines: [validLine] }).success).toBe(false);
    expect(purchaseOrderSchema.safeParse({ tax: "0", shipping: "-1", lines: [validLine] }).success).toBe(false);
  });
});
