import { describe, expect, it } from "vitest";

import { partCsvRowSchema, partSchema, partTransactionSchema } from "@/lib/validation/parts";

describe("partSchema", () => {
  const valid = {
    number: "PIE-1001",
    name: "Courroie de convoyeur 24po",
    unit: "unité",
    unitCost: "145",
    minThreshold: "4",
  };

  it("parses a valid payload and coerces unitCost/minThreshold to numbers", () => {
    const result = partSchema.parse(valid);
    expect(result.unitCost).toBe(145);
    expect(typeof result.unitCost).toBe("number");
    expect(result.minThreshold).toBe(4);
  });

  it("rejects a missing required number", () => {
    const { number: _number, ...rest } = valid;
    void _number;
    expect(partSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a negative unitCost", () => {
    expect(partSchema.safeParse({ ...valid, unitCost: "-1" }).success).toBe(false);
  });

  it("rejects a negative minThreshold", () => {
    expect(partSchema.safeParse({ ...valid, minThreshold: "-1" }).success).toBe(false);
  });
});

describe("partCsvRowSchema", () => {
  it("parses a valid row, optional numeric fields coerced", () => {
    const result = partCsvRowSchema.parse({ number: "PIE-1002", name: "Roulement", unit_cost: "18", min_threshold: "10" });
    expect(result.unit_cost).toBe(18);
  });

  it("rejects a missing required name", () => {
    expect(partCsvRowSchema.safeParse({ number: "PIE-1002" }).success).toBe(false);
  });
});

describe("partTransactionSchema", () => {
  it("parses a valid payload and coerces quantity", () => {
    const result = partTransactionSchema.parse({ type: "usage", quantity: "3" });
    expect(result.quantity).toBe(3);
  });

  it("rejects a zero or negative quantity (must be positive)", () => {
    expect(partTransactionSchema.safeParse({ type: "usage", quantity: "0" }).success).toBe(false);
    expect(partTransactionSchema.safeParse({ type: "usage", quantity: "-2" }).success).toBe(false);
  });

  it("rejects an invalid transaction type", () => {
    expect(partTransactionSchema.safeParse({ type: "teleportation", quantity: "1" }).success).toBe(false);
  });
});
