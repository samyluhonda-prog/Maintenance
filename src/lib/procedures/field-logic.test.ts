import { describe, expect, it } from "vitest";

import {
  computeScore,
  hasFailedPassFail,
  isAnswerEmpty,
  isFieldVisible,
  type FieldConfig,
  type ScoreField,
} from "@/lib/procedures/field-logic";

describe("isFieldVisible", () => {
  it("is always visible when config has no condition", () => {
    expect(isFieldVisible(null, new Map())).toBe(true);
    expect(isFieldVisible(undefined, new Map())).toBe(true);
    expect(isFieldVisible({}, new Map())).toBe(true);
  });

  it("eq: visible only when the referenced answer matches the condition value", () => {
    const config: FieldConfig = { condition: { field_id: "f1", operator: "eq", value: "yes" } };
    expect(isFieldVisible(config, new Map([["f1", "yes"]]))).toBe(true);
    expect(isFieldVisible(config, new Map([["f1", "no"]]))).toBe(false);
  });

  it("neq: visible when the referenced answer differs from the condition value", () => {
    const config: FieldConfig = { condition: { field_id: "f1", operator: "neq", value: "yes" } };
    expect(isFieldVisible(config, new Map([["f1", "no"]]))).toBe(true);
    expect(isFieldVisible(config, new Map([["f1", "yes"]]))).toBe(false);
  });

  it("a condition referencing an unanswered field evaluates to hidden, for both eq and neq", () => {
    const eqConfig: FieldConfig = { condition: { field_id: "missing", operator: "eq", value: "yes" } };
    const neqConfig: FieldConfig = { condition: { field_id: "missing", operator: "neq", value: "yes" } };
    expect(isFieldVisible(eqConfig, new Map())).toBe(false);
    // neq specifically special-cases an empty actual value as NOT satisfying the
    // "different from" condition, so it too resolves to hidden rather than shown.
    expect(isFieldVisible(neqConfig, new Map())).toBe(false);
  });

  it("compares numbers and booleans as their string form", () => {
    const numberConfig: FieldConfig = { condition: { field_id: "f1", operator: "eq", value: "42" } };
    expect(isFieldVisible(numberConfig, new Map([["f1", 42]]))).toBe(true);
    const boolConfig: FieldConfig = { condition: { field_id: "f1", operator: "eq", value: "true" } };
    expect(isFieldVisible(boolConfig, new Map([["f1", true]]))).toBe(true);
  });

  it("never satisfies a condition when the referenced answer is an object (photo/signature/file)", () => {
    const config: FieldConfig = { condition: { field_id: "f1", operator: "eq", value: "some-path" } };
    expect(isFieldVisible(config, new Map([["f1", { path: "some-path" }]]))).toBe(false);
  });
});

describe("isAnswerEmpty", () => {
  it("section and instructions are never empty (not answerable)", () => {
    expect(isAnswerEmpty("section", undefined)).toBe(false);
    expect(isAnswerEmpty("instructions", null)).toBe(false);
  });

  it("null/undefined are empty for every answerable type", () => {
    expect(isAnswerEmpty("text", null)).toBe(true);
    expect(isAnswerEmpty("text", undefined)).toBe(true);
    expect(isAnswerEmpty("number", null)).toBe(true);
  });

  it("text/free_text/datetime: empty string (incl. whitespace-only) is empty", () => {
    expect(isAnswerEmpty("text", "")).toBe(true);
    expect(isAnswerEmpty("text", "   ")).toBe(true);
    expect(isAnswerEmpty("free_text", "hello")).toBe(false);
    expect(isAnswerEmpty("datetime", "2026-01-01T00:00")).toBe(false);
  });

  it("number/meter_reading/amount_range: 0 is NOT empty, NaN is empty", () => {
    expect(isAnswerEmpty("number", 0)).toBe(false);
    expect(isAnswerEmpty("meter_reading", 0)).toBe(false);
    expect(isAnswerEmpty("amount_range", NaN)).toBe(true);
    expect(isAnswerEmpty("number", "5")).toBe(true); // wrong shape (string, not number) counts as empty
  });

  it("yesno/multiple_choice/pass_fail: empty string is empty, any other string is answered", () => {
    expect(isAnswerEmpty("yesno", "")).toBe(true);
    expect(isAnswerEmpty("yesno", "yes")).toBe(false);
    expect(isAnswerEmpty("pass_fail", "fail")).toBe(false);
  });

  it("checkbox requires an active `true` — false is treated as empty by design (an unchecked confirmation)", () => {
    expect(isAnswerEmpty("checkbox", true)).toBe(false);
    expect(isAnswerEmpty("checkbox", false)).toBe(true);
  });

  it("photo/signature/file: empty unless the value is an object with a non-empty path", () => {
    expect(isAnswerEmpty("photo", null)).toBe(true);
    expect(isAnswerEmpty("photo", {})).toBe(true);
    expect(isAnswerEmpty("signature", { path: "" })).toBe(true);
    expect(isAnswerEmpty("file", { path: "answers/foo.png" })).toBe(false);
  });

  it("an empty array is empty for text-like handling (falls through to the type's own rule, not array-aware)", () => {
    // number/meter_reading/amount_range treat a non-number (incl. []) as empty.
    expect(isAnswerEmpty("number", [])).toBe(true);
  });
});

describe("computeScore", () => {
  function field(id: string, type: ScoreField["type"], config: FieldConfig | null = null): ScoreField {
    return { id, type, config };
  }

  it("is 100 when there are no pass_fail/yesno fields at all", () => {
    const fields = [field("f1", "text"), field("f2", "number")];
    expect(computeScore(fields, new Map())).toBe(100);
  });

  it("is the percentage of pass_fail/yesno fields answered pass/yes", () => {
    const fields = [field("f1", "pass_fail"), field("f2", "pass_fail"), field("f3", "yesno")];
    const answers = new Map<string, unknown>([
      ["f1", "pass"],
      ["f2", "fail"],
      ["f3", "yes"],
    ]);
    expect(computeScore(fields, answers)).toBe(67); // 2/3 rounded
  });

  it("counts an unanswered pass_fail/yesno field in the denominator but not the numerator", () => {
    const fields = [field("f1", "pass_fail"), field("f2", "pass_fail")];
    const answers = new Map<string, unknown>([["f1", "pass"]]); // f2 unanswered
    expect(computeScore(fields, answers)).toBe(50);
  });

  it("ignores fields hidden by a condition", () => {
    const config: FieldConfig = { condition: { field_id: "gate", operator: "eq", value: "show" } };
    const fields = [field("f1", "pass_fail"), field("f2", "pass_fail", config)];
    // f2 is hidden (gate !== "show"), so only f1 counts -> 100%, not 50%.
    const answers = new Map<string, unknown>([
      ["f1", "pass"],
      ["f2", "fail"],
    ]);
    expect(computeScore(fields, answers)).toBe(100);
  });

  it("ignores non-scoring field types entirely (checkbox, number, etc.)", () => {
    const fields = [field("f1", "pass_fail"), field("f2", "checkbox"), field("f3", "number")];
    const answers = new Map<string, unknown>([
      ["f1", "pass"],
      ["f2", true],
      ["f3", 5],
    ]);
    expect(computeScore(fields, answers)).toBe(100);
  });
});

describe("hasFailedPassFail", () => {
  function field(id: string, type: ScoreField["type"], config: FieldConfig | null = null): ScoreField {
    return { id, type, config };
  }

  it("is false when there are no pass_fail fields, or none failed", () => {
    expect(hasFailedPassFail([field("f1", "yesno")], new Map([["f1", "no"]]))).toBe(false);
    expect(hasFailedPassFail([field("f1", "pass_fail")], new Map([["f1", "pass"]]))).toBe(false);
  });

  it("is true when any visible pass_fail field is answered fail", () => {
    const fields = [field("f1", "pass_fail"), field("f2", "pass_fail")];
    const answers = new Map<string, unknown>([
      ["f1", "pass"],
      ["f2", "fail"],
    ]);
    expect(hasFailedPassFail(fields, answers)).toBe(true);
  });

  it("ignores a failed answer on a field hidden by its condition", () => {
    const config: FieldConfig = { condition: { field_id: "gate", operator: "eq", value: "show" } };
    const fields = [field("f1", "pass_fail", config)];
    const answers = new Map<string, unknown>([["f1", "fail"]]); // gate unset -> hidden
    expect(hasFailedPassFail(fields, answers)).toBe(false);
  });
});
