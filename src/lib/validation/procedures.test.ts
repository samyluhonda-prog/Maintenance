import { describe, expect, it } from "vitest";

import { procedureFieldSchema, procedureTemplateSchema } from "@/lib/validation/procedures";

describe("procedureTemplateSchema", () => {
  it("parses a valid payload", () => {
    const result = procedureTemplateSchema.parse({ name: "Inspection quotidienne — Convoyeurs" });
    expect(result.name).toBe("Inspection quotidienne — Convoyeurs");
  });

  it("rejects a missing required name", () => {
    expect(procedureTemplateSchema.safeParse({ description: "x" }).success).toBe(false);
  });
});

describe("procedureFieldSchema", () => {
  it("parses a valid simple field", () => {
    const result = procedureFieldSchema.parse({ type: "yesno", label: "Tension conforme ?", isRequired: true });
    expect(result.type).toBe("yesno");
  });

  it("rejects an invalid field type", () => {
    expect(procedureFieldSchema.safeParse({ type: "carousel", label: "X", isRequired: false }).success).toBe(false);
  });

  it("rejects multiple_choice with fewer than two non-empty options", () => {
    const result = procedureFieldSchema.safeParse({
      type: "multiple_choice",
      label: "Choix",
      isRequired: true,
      options: ["Seule option"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple_choice with two or more non-empty options", () => {
    const result = procedureFieldSchema.safeParse({
      type: "multiple_choice",
      label: "Choix",
      isRequired: true,
      options: ["A", "B"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects min greater than max (cross-field refinement), coercing both from form strings", () => {
    const result = procedureFieldSchema.safeParse({
      type: "number",
      label: "Niveau",
      isRequired: true,
      min: "10",
      max: "5",
    });
    expect(result.success).toBe(false);
  });

  it("accepts min <= max", () => {
    const result = procedureFieldSchema.safeParse({
      type: "number",
      label: "Niveau",
      isRequired: true,
      min: "0",
      max: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min).toBe(0);
      expect(result.data.max).toBe(25);
    }
  });
});
