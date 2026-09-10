import { describe, expect, it } from "vitest";

import { automationRuleSchema } from "@/lib/validation/automations";

describe("automationRuleSchema", () => {
  const validAction = { type: "notify" };

  it("parses a valid payload", () => {
    const result = automationRuleSchema.parse({
      name: "Alerte immédiate — demande critique",
      isActive: true,
      triggerEvent: "request.critical_created",
      actions: [validAction],
    });
    expect(result.actions).toHaveLength(1);
  });

  it("rejects a missing required name", () => {
    expect(
      automationRuleSchema.safeParse({
        isActive: true,
        triggerEvent: "request.created",
        actions: [validAction],
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid triggerEvent enum value", () => {
    expect(
      automationRuleSchema.safeParse({
        name: "X",
        isActive: true,
        triggerEvent: "not.a.real.event",
        actions: [validAction],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty actions array", () => {
    expect(
      automationRuleSchema.safeParse({
        name: "X",
        isActive: true,
        triggerEvent: "request.created",
        actions: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an action with invalid JSON in paramsJson (superRefine)", () => {
    expect(
      automationRuleSchema.safeParse({
        name: "X",
        isActive: true,
        triggerEvent: "request.created",
        actions: [{ type: "notify", paramsJson: "{bad json" }],
      }).success,
    ).toBe(false);
  });

  it("accepts an action with valid JSON params", () => {
    expect(
      automationRuleSchema.safeParse({
        name: "X",
        isActive: true,
        triggerEvent: "request.created",
        actions: [{ type: "notify", paramsJson: '{"role":"supervisor"}' }],
      }).success,
    ).toBe(true);
  });
});
