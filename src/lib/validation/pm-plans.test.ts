import { describe, expect, it } from "vitest";

import { pmPlanSchema, pmTriggerSchema } from "@/lib/validation/pm-plans";

describe("pmPlanSchema", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";
  const valid = {
    name: "PM mensuelle — Trieur optique",
    equipmentId: validUuid,
    woTitle: "Inspection préventive mensuelle",
    woPriority: "high" as const,
    leadTimeDays: "3",
    status: "active" as const,
  };

  it("parses a valid payload and coerces leadTimeDays", () => {
    const result = pmPlanSchema.parse(valid);
    expect(result.leadTimeDays).toBe(3);
  });

  it("rejects a missing equipmentId", () => {
    const { equipmentId: _equipmentId, ...rest } = valid;
    void _equipmentId;
    expect(pmPlanSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a negative leadTimeDays", () => {
    expect(pmPlanSchema.safeParse({ ...valid, leadTimeDays: "-1" }).success).toBe(false);
  });
});

describe("pmTriggerSchema", () => {
  it("parses a valid calendar trigger", () => {
    const result = pmTriggerSchema.parse({
      kind: "calendar",
      frequencyUnit: "month",
      frequencyValue: "1",
      fixedInterval: true,
      toleranceDays: "0",
      isActive: true,
    });
    expect(result.frequencyValue).toBe(1);
  });

  it("rejects a calendar trigger missing frequencyUnit/frequencyValue (superRefine)", () => {
    const result = pmTriggerSchema.safeParse({
      kind: "calendar",
      fixedInterval: true,
      toleranceDays: "0",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("parses a valid meter trigger", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";
    const result = pmTriggerSchema.parse({
      kind: "meter",
      meterId: validUuid,
      meterInterval: "250",
      meterOperator: "gte",
      fixedInterval: false,
      toleranceDays: "0",
      isActive: true,
    });
    expect(result.meterInterval).toBe(250);
  });

  it("rejects a meter trigger missing meterId/meterInterval/meterOperator", () => {
    const result = pmTriggerSchema.safeParse({
      kind: "meter",
      fixedInterval: false,
      toleranceDays: "0",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a condition trigger with invalid JSON in conditionExpression", () => {
    const result = pmTriggerSchema.safeParse({
      kind: "condition",
      conditionExpression: "{not valid json",
      fixedInterval: false,
      toleranceDays: "0",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});
