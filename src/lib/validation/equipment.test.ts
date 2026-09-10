import { describe, expect, it } from "vitest";

import { equipmentCsvRowSchema, equipmentSchema } from "@/lib/validation/equipment";

describe("equipmentSchema", () => {
  const valid = {
    name: "Convoyeur A1",
    status: "operational" as const,
    criticality: "medium" as const,
  };

  it("parses a minimal valid payload with expected output shape", () => {
    const result = equipmentSchema.parse(valid);
    expect(result.name).toBe("Convoyeur A1");
    expect(result.status).toBe("operational");
    expect(result.criticality).toBe("medium");
  });

  it("rejects a missing required name", () => {
    const { name: _name, ...rest } = valid;
    void _name;
    expect(equipmentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid status enum value", () => {
    const result = equipmentSchema.safeParse({ ...valid, status: "broken" });
    expect(result.success).toBe(false);
  });

  it("coerces acquisitionCost from a form string to a number (z.coerce.number)", () => {
    const result = equipmentSchema.parse({ ...valid, acquisitionCost: "1250.50" });
    expect(result.acquisitionCost).toBe(1250.5);
    expect(typeof result.acquisitionCost).toBe("number");
  });

  it("rejects a negative acquisitionCost", () => {
    const result = equipmentSchema.safeParse({ ...valid, acquisitionCost: "-5" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer expectedLifetimeMonths", () => {
    const result = equipmentSchema.safeParse({ ...valid, expectedLifetimeMonths: "3.5" });
    expect(result.success).toBe(false);
  });
});

describe("equipmentCsvRowSchema", () => {
  it("parses a valid CSV row", () => {
    const result = equipmentCsvRowSchema.parse({ name: "Chargeuse L120", criticality: "medium", status: "operational" });
    expect(result.name).toBe("Chargeuse L120");
  });

  it("rejects a missing required name", () => {
    expect(equipmentCsvRowSchema.safeParse({ category: "Convoyeur" }).success).toBe(false);
  });

  it("rejects an invalid criticality enum value", () => {
    expect(equipmentCsvRowSchema.safeParse({ name: "X", criticality: "super-critical" }).success).toBe(false);
  });
});
