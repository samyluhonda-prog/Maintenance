import { describe, expect, it } from "vitest";

import { meterReadingSchema, meterSchema } from "@/lib/validation/meters";

describe("meterSchema", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("parses a valid payload", () => {
    const result = meterSchema.parse({
      equipmentId: validUuid,
      name: "Heures moteur",
      unit: "h",
      kind: "hours",
      source: "manual",
      isCumulative: true,
    });
    expect(result.name).toBe("Heures moteur");
  });

  it("rejects a missing/invalid equipmentId", () => {
    expect(
      meterSchema.safeParse({
        equipmentId: "not-a-uuid",
        name: "Heures moteur",
        unit: "h",
        kind: "hours",
        source: "manual",
        isCumulative: true,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid kind enum value", () => {
    expect(
      meterSchema.safeParse({
        equipmentId: validUuid,
        name: "X",
        unit: "h",
        kind: "not-a-kind",
        source: "manual",
        isCumulative: true,
      }).success,
    ).toBe(false);
  });
});

describe("meterReadingSchema", () => {
  it("parses a valid payload and coerces value from a form string", () => {
    const result = meterReadingSchema.parse({ value: "1234.5", recordedAt: "2026-01-15T10:00" });
    expect(result.value).toBe(1234.5);
    expect(typeof result.value).toBe("number");
  });

  it("rejects a missing recordedAt", () => {
    expect(meterReadingSchema.safeParse({ value: "10", recordedAt: "" }).success).toBe(false);
  });

  it("rejects a non-numeric value", () => {
    expect(meterReadingSchema.safeParse({ value: "not-a-number", recordedAt: "2026-01-15T10:00" }).success).toBe(false);
  });
});
