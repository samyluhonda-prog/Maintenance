/**
 * Pure helpers shared between the PM trigger server actions (initial
 * `next_due_at` at creation time) and the scheduled evaluation route
 * (advancing `next_due_at` after generating a work order). Kept dependency-free
 * so both sides compute the same thing the same way.
 */

export type FrequencyUnit = "day" | "week" | "month" | "year" | "custom";

/**
 * Computes the next calendar occurrence strictly after `from`.
 * - day / week / month / year: adds `value` of that unit to `from`.
 * - custom with `daysOfWeek` set (0 = Sunday … 6 = Saturday): the next date
 *   after `from` whose weekday is in `daysOfWeek`.
 * - custom without `daysOfWeek`: treated as a plain "every `value` days" interval.
 */
export function computeNextCalendarDueDate(
  from: Date,
  unit: FrequencyUnit,
  value: number,
  daysOfWeek?: number[] | null,
): Date {
  if (unit === "custom" && daysOfWeek && daysOfWeek.length > 0) {
    const next = new Date(from);
    for (let i = 1; i <= 7; i++) {
      next.setDate(from.getDate() + i);
      if (daysOfWeek.includes(next.getDay())) return next;
    }
    return next;
  }

  const next = new Date(from);
  switch (unit) {
    case "day":
    case "custom":
      next.setDate(next.getDate() + value);
      break;
    case "week":
      next.setDate(next.getDate() + value * 7);
      break;
    case "month":
      next.setMonth(next.getMonth() + value);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + value);
      break;
  }
  return next;
}

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function frequencyUnitLabel(unit: FrequencyUnit, value: number): string {
  switch (unit) {
    case "day":
      return value === 1 ? "jour" : "jours";
    case "week":
      return value === 1 ? "semaine" : "semaines";
    case "month":
      return "mois";
    case "year":
      return value === 1 ? "an" : "ans";
    case "custom":
      return value === 1 ? "jour" : "jours";
  }
}

export type PmTriggerLike = {
  kind: "calendar" | "meter" | "condition";
  frequency_unit: FrequencyUnit | null;
  frequency_value: number | null;
  days_of_week: number[] | null;
  meter_interval: number | null;
  meter_operator: "gte" | "lte" | "eq" | null;
};

/** Human-readable (French) one-liner for a trigger, e.g. "Tous les 1 mois" / "Tous les 250 h (compteur)". */
export function summarizePmTrigger(trigger: PmTriggerLike, meterUnit?: string | null): string {
  if (trigger.kind === "calendar") {
    if (trigger.frequency_unit === "custom" && trigger.days_of_week && trigger.days_of_week.length > 0) {
      const days = trigger.days_of_week
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d] ?? String(d))
        .join(", ");
      return `Chaque semaine : ${days}`;
    }
    if (trigger.frequency_unit && trigger.frequency_value) {
      return `Tous les ${trigger.frequency_value} ${frequencyUnitLabel(trigger.frequency_unit, trigger.frequency_value)}`;
    }
    return "Calendrier (non configuré)";
  }
  if (trigger.kind === "meter") {
    const opLabel = trigger.meter_operator === "lte" ? "diminution de" : trigger.meter_operator === "eq" ? "exactement" : "";
    const unit = meterUnit ?? "unités";
    if (trigger.meter_interval == null) return "Compteur (non configuré)";
    return `Tous les ${opLabel ? `${opLabel} ` : ""}${trigger.meter_interval} ${unit} (compteur)`;
  }
  return "Condition personnalisée";
}
