import { describe, expect, it } from "vitest";

import { computeNextCalendarDueDate, summarizePmTrigger, type PmTriggerLike } from "@/lib/pm/schedule";

// The source computes with local-time Date methods (setDate/getDate/etc.), so
// tests build `from` from local components and assert with local getters too
// — that keeps the test self-consistent (and thus TZ-independent) without
// relying on the sandbox happening to run in UTC.
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("computeNextCalendarDueDate", () => {
  const from = new Date(2026, 0, 15, 10, 0, 0); // 2026-01-15, a Thursday

  it("day: adds `value` days", () => {
    const next = computeNextCalendarDueDate(from, "day", 3);
    expect(ymd(next)).toBe("2026-01-18");
  });

  it("week: adds `value` weeks (value * 7 days)", () => {
    const next = computeNextCalendarDueDate(from, "week", 2);
    expect(ymd(next)).toBe("2026-01-29");
  });

  it("month: adds `value` months, handling month-length rollover", () => {
    const next = computeNextCalendarDueDate(from, "month", 1);
    expect(ymd(next)).toBe("2026-02-15");

    // Jan 31 + 1 month rolls into March in JS Date's `setMonth` semantics
    // (Feb has no 31st) — documenting the actual (if surprising) behavior.
    const jan31 = new Date(2026, 0, 31, 10, 0, 0);
    const rolled = computeNextCalendarDueDate(jan31, "month", 1);
    expect(rolled.getMonth()).toBe(2); // March (0-indexed), not February
  });

  it("year: adds `value` years", () => {
    const next = computeNextCalendarDueDate(from, "year", 1);
    expect(ymd(next)).toBe("2027-01-15");
  });

  it("custom without daysOfWeek: treated as a plain every-N-days interval", () => {
    const next = computeNextCalendarDueDate(from, "custom", 5, null);
    expect(ymd(next)).toBe("2026-01-20");
    const next2 = computeNextCalendarDueDate(from, "custom", 5, []);
    expect(ymd(next2)).toBe("2026-01-20");
  });

  it("custom with daysOfWeek: finds the next matching weekday strictly after `from`", () => {
    // 2026-01-15 is a Thursday (day 4). Next Monday (1) should be 2026-01-19.
    expect(from.getDay()).toBe(4);
    const next = computeNextCalendarDueDate(from, "custom", 1, [1]);
    expect(next.getDay()).toBe(1);
    expect(ymd(next)).toBe("2026-01-19");
  });

  it("custom with daysOfWeek including the same weekday as `from`: still returns strictly after (next week)", () => {
    // Thursday (4) is in the list — the loop starts at i=1, so it can't return `from` itself.
    const next = computeNextCalendarDueDate(from, "custom", 1, [4]);
    expect(ymd(next)).toBe("2026-01-22");
  });

  // NB: the fixed-vs-floating cadence distinction (whether a PM trigger's
  // next_due_at is advanced from the *previous* next_due_at, "fixed", or
  // needs a work-order-completion hook, "floating") is orchestrated by the
  // caller (src/app/api/automations/run/route.ts), not by this pure function
  // — computeNextCalendarDueDate only ever advances from whatever `from` it's
  // given. That orchestration isn't unit-testable in isolation here since it
  // reads/writes via a live Supabase admin client.
});

describe("summarizePmTrigger", () => {
  function calendarTrigger(overrides: Partial<PmTriggerLike> = {}): PmTriggerLike {
    return {
      kind: "calendar",
      frequency_unit: "month",
      frequency_value: 1,
      days_of_week: null,
      meter_interval: null,
      meter_operator: null,
      ...overrides,
    };
  }

  it("calendar, singular unit values use the singular French label", () => {
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "month", frequency_value: 1 }))).toBe("Tous les 1 mois");
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "day", frequency_value: 1 }))).toBe("Tous les 1 jour");
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "year", frequency_value: 1 }))).toBe("Tous les 1 an");
  });

  it("calendar, plural unit values", () => {
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "day", frequency_value: 5 }))).toBe("Tous les 5 jours");
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "week", frequency_value: 2 }))).toBe("Tous les 2 semaines");
    expect(summarizePmTrigger(calendarTrigger({ frequency_unit: "year", frequency_value: 3 }))).toBe("Tous les 3 ans");
  });

  it("calendar with custom days-of-week lists sorted French day names", () => {
    const trigger = calendarTrigger({ frequency_unit: "custom", days_of_week: [3, 1] });
    expect(summarizePmTrigger(trigger)).toBe("Chaque semaine : lundi, mercredi");
  });

  it("calendar with nothing configured", () => {
    const trigger = calendarTrigger({ frequency_unit: null, frequency_value: null });
    expect(summarizePmTrigger(trigger)).toBe("Calendrier (non configuré)");
  });

  it("meter trigger, gte (no operator label) and lte/eq variants", () => {
    const gte: PmTriggerLike = {
      kind: "meter",
      frequency_unit: null,
      frequency_value: null,
      days_of_week: null,
      meter_interval: 250,
      meter_operator: "gte",
    };
    expect(summarizePmTrigger(gte, "h")).toBe("Tous les 250 h (compteur)");

    const lte: PmTriggerLike = { ...gte, meter_operator: "lte" };
    expect(summarizePmTrigger(lte, "h")).toBe("Tous les diminution de 250 h (compteur)");

    const eq: PmTriggerLike = { ...gte, meter_operator: "eq" };
    expect(summarizePmTrigger(eq, "h")).toBe("Tous les exactement 250 h (compteur)");
  });

  it("meter trigger defaults the unit label when none is given", () => {
    const trigger: PmTriggerLike = {
      kind: "meter",
      frequency_unit: null,
      frequency_value: null,
      days_of_week: null,
      meter_interval: 100,
      meter_operator: "gte",
    };
    expect(summarizePmTrigger(trigger)).toBe("Tous les 100 unités (compteur)");
  });

  it("meter trigger with nothing configured", () => {
    const trigger: PmTriggerLike = {
      kind: "meter",
      frequency_unit: null,
      frequency_value: null,
      days_of_week: null,
      meter_interval: null,
      meter_operator: null,
    };
    expect(summarizePmTrigger(trigger)).toBe("Compteur (non configuré)");
  });

  it("condition trigger always summarizes the same way", () => {
    const trigger: PmTriggerLike = {
      kind: "condition",
      frequency_unit: null,
      frequency_value: null,
      days_of_week: null,
      meter_interval: null,
      meter_operator: null,
    };
    expect(summarizePmTrigger(trigger)).toBe("Condition personnalisée");
  });
});
