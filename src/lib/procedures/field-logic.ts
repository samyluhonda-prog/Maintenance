/**
 * Shared, framework-agnostic helpers for the procedure builder/execution
 * engine. Imported from both client components (live show/hide + inline
 * validation while answering) and server actions (`completeProcedureRunAction`
 * re-validates the same rules server-side) — no "use server"/"use client"
 * here on purpose, it's plain logic.
 */

export type ProcedureFieldType =
  | "section"
  | "text"
  | "instructions"
  | "checkbox"
  | "yesno"
  | "multiple_choice"
  | "number"
  | "free_text"
  | "datetime"
  | "meter_reading"
  | "pass_fail"
  | "photo"
  | "signature"
  | "file"
  | "amount_range";

export const PROCEDURE_FIELD_TYPES: ProcedureFieldType[] = [
  "section",
  "text",
  "instructions",
  "checkbox",
  "yesno",
  "multiple_choice",
  "number",
  "free_text",
  "datetime",
  "meter_reading",
  "pass_fail",
  "photo",
  "signature",
  "file",
  "amount_range",
];

/** Types that never collect an answer — skipped by required checks, scoring, and visibility gating of what comes after them. */
export const NON_ANSWERABLE_TYPES = new Set<ProcedureFieldType>(["section", "instructions"]);

export type ConditionOperator = "eq" | "neq";

export type FieldCondition = {
  field_id: string;
  operator: ConditionOperator;
  value: string;
};

/** Shape of `procedure_fields.config` — type-dependent, see migration 0009 comments. */
export type FieldConfig = {
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  condition?: FieldCondition;
};

export type FileAnswerValue = { path: string; fileName?: string };

/** Turns any stored answer `value` into a comparable string for condition matching. */
function answerToComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return ""; // objects (photo/signature/file) never satisfy a condition
}

/**
 * A field with no `config.condition` is always visible. Otherwise it's shown
 * only when the referenced field's current answer matches per `operator`
 * (only `eq`/`neq` are supported — deliberately not a full expression
 * language, per spec). A condition referencing a field with no answer yet
 * (or one that was deleted) simply evaluates to hidden rather than erroring.
 */
export function isFieldVisible(config: FieldConfig | null | undefined, answers: Map<string, unknown>): boolean {
  const condition = config?.condition;
  if (!condition) return true;
  const actual = answerToComparable(answers.get(condition.field_id));
  if (condition.operator === "neq") return actual !== "" && actual !== condition.value;
  return actual === condition.value;
}

/** True when `value` counts as "no answer yet" for the given field type. */
export function isAnswerEmpty(type: ProcedureFieldType, value: unknown): boolean {
  if (NON_ANSWERABLE_TYPES.has(type)) return false;
  if (value === null || value === undefined) return true;
  switch (type) {
    case "checkbox":
      // A required checkbox must be actively checked (common "I confirm…" pattern).
      return value !== true;
    case "photo":
    case "signature":
    case "file":
      return typeof value !== "object" || !(value as FileAnswerValue).path;
    case "text":
    case "free_text":
    case "datetime":
      return typeof value !== "string" || value.trim() === "";
    case "number":
    case "meter_reading":
    case "amount_range":
      return typeof value !== "number" || Number.isNaN(value);
    case "yesno":
    case "multiple_choice":
    case "pass_fail":
      return typeof value !== "string" || value === "";
    default:
      return false;
  }
}

export type ScoreField = { id: string; type: ProcedureFieldType; config: FieldConfig | null };

/**
 * Score formula (documented once, here): percentage of currently-visible
 * pass_fail/yesno fields whose answer is "pass"/"yes" — an unanswered
 * pass_fail/yesno field counts against the score (denominator includes it,
 * numerator doesn't). 100 when there are no pass_fail/yesno fields at all.
 */
export function computeScore(fields: ScoreField[], answers: Map<string, unknown>): number {
  let total = 0;
  let passed = 0;
  for (const field of fields) {
    if (field.type !== "pass_fail" && field.type !== "yesno") continue;
    if (!isFieldVisible(field.config, answers)) continue;
    total++;
    const value = answers.get(field.id);
    if (value === "pass" || value === "yes") passed++;
  }
  return total === 0 ? 100 : Math.round((passed / total) * 100);
}

/** True when any visible `pass_fail` field's current answer is "fail". */
export function hasFailedPassFail(fields: ScoreField[], answers: Map<string, unknown>): boolean {
  return fields.some(
    (f) => f.type === "pass_fail" && isFieldVisible(f.config, answers) && answers.get(f.id) === "fail",
  );
}
