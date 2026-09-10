import { describe, expect, it } from "vitest";

import { correctiveActionSchema, rcaCauseSchema, rcaRecordSchema } from "@/lib/validation/rca";

describe("rcaRecordSchema", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("parses a valid payload", () => {
    const result = rcaRecordSchema.parse({
      title: "Arrêts répétés du trieur optique OS-3000",
      problemStatement: "Le trieur s'arrête de façon inattendue.",
      equipmentId: validUuid,
    });
    expect(result.title).toContain("Arrêts");
  });

  it("rejects a missing required problemStatement", () => {
    expect(
      rcaRecordSchema.safeParse({ title: "X", equipmentId: validUuid }).success,
    ).toBe(false);
  });

  it("rejects an invalid equipmentId", () => {
    expect(
      rcaRecordSchema.safeParse({ title: "X", problemStatement: "Y", equipmentId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});

describe("rcaCauseSchema", () => {
  it("parses a valid payload", () => {
    const result = rcaCauseSchema.parse({ category: "machine", description: "Capteur défectueux." });
    expect(result.category).toBe("machine");
  });

  it("rejects an invalid category enum value", () => {
    expect(rcaCauseSchema.safeParse({ category: "aliens", description: "X" }).success).toBe(false);
  });
});

describe("correctiveActionSchema", () => {
  it("parses a valid payload", () => {
    const result = correctiveActionSchema.parse({ description: "Réactiver le nettoyage automatique." });
    expect(result.description).toContain("Réactiver");
  });

  it("rejects a missing required description", () => {
    expect(correctiveActionSchema.safeParse({ dueDate: "2026-01-01" }).success).toBe(false);
  });
});
