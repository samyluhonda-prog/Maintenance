/**
 * Turns due PM triggers into work orders. NOT invoked automatically by this
 * app — call it on a schedule from outside (e.g. every hour):
 *   - Vercel Cron (a `crons` entry in vercel.json hitting this path), or
 *   - a Supabase scheduled Edge Function that does the POST, or
 *   - any external cron (systemd timer, GitHub Actions schedule, etc.)
 * hitting `POST /api/automations/run` with header `x-automations-secret:
 * <AUTOMATIONS_CRON_SECRET>`. This path is listed in PUBLIC_PREFIXES in
 * src/lib/supabase/middleware.ts (so it's reachable without a user session);
 * the shared-secret header below is the real gate.
 *
 * Also reachable on demand via the "Vérifier maintenant" button on the PM
 * plans list page, which calls it through runAutomationsNowAction (server
 * action) rather than the browser — see lib/actions/automations.ts.
 */
import { NextResponse } from "next/server";

import { computeNextCalendarDueDate, type FrequencyUnit } from "@/lib/pm/schedule";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = request.headers.get("x-automations-secret");
  if (!secret || secret !== process.env.AUTOMATIONS_CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.slice(0, 10);

  const errors: string[] = [];
  let evaluated = 0;
  let generated = 0;

  // ---------------------------------------------------------------------
  // Calendar triggers whose next_due_at has arrived.
  // ---------------------------------------------------------------------
  const { data: calendarTriggers, error: calError } = await admin
    .from("pm_triggers")
    .select("*")
    .eq("kind", "calendar")
    .eq("is_active", true)
    .not("next_due_at", "is", null)
    .lte("next_due_at", nowIso);
  if (calError) errors.push(`Requête des déclencheurs calendrier : ${calError.message}`);

  for (const trigger of calendarTriggers ?? []) {
    evaluated++;
    const { error: genError } = await admin.rpc("generate_pm_work_order", {
      p_trigger_id: trigger.id,
      p_occurrence: todayStr,
    });
    if (genError) {
      errors.push(`Déclencheur ${trigger.id} : ${genError.message}`);
      continue;
    }
    generated++;

    if (trigger.fixed_interval) {
      // Fixed cadence: advance from the previous next_due_at so the schedule
      // doesn't drift with how promptly the cron actually runs.
      if (trigger.frequency_unit && trigger.frequency_value) {
        const next = computeNextCalendarDueDate(
          new Date(trigger.next_due_at!),
          trigger.frequency_unit as FrequencyUnit,
          trigger.frequency_value,
          trigger.days_of_week,
        );
        const { error: updError } = await admin
          .from("pm_triggers")
          .update({ next_due_at: next.toISOString() })
          .eq("id", trigger.id);
        if (updError) errors.push(`Déclencheur ${trigger.id} : échec de la mise à jour de next_due_at (${updError.message})`);
      }
    }
    // Floating cadence (fixed_interval = false): intentionally NOT advanced
    // here. app.generate_pm_work_order only sets last_generated_at, and a
    // floating trigger's next occurrence is "N days/months after the
    // generated work order's *completion*" — which isn't known yet at
    // generation time. Advancing it correctly needs a work_order.completed
    // hook to recompute next_due_at once that WO actually closes. That hook
    // is out of scope for this pass; until it exists, floating triggers will
    // keep re-matching next_due_at <= now on every run (harmless — it's
    // already past due — but won't self-correct without that hook).
  }

  // ---------------------------------------------------------------------
  // Meter triggers: compare each meter's latest reading against
  // meter_interval relative to last_generated_meter_value.
  // ---------------------------------------------------------------------
  const { data: meterTriggers, error: meterTrigError } = await admin
    .from("pm_triggers")
    .select("*")
    .eq("kind", "meter")
    .eq("is_active", true)
    .not("meter_id", "is", null);
  if (meterTrigError) errors.push(`Requête des déclencheurs compteur : ${meterTrigError.message}`);

  const meterIds = Array.from(new Set((meterTriggers ?? []).map((t) => t.meter_id).filter((id): id is string => !!id)));
  const latestByMeter = new Map<string, number>();
  if (meterIds.length > 0) {
    const { data: readings, error: readError } = await admin
      .from("meter_readings")
      .select("meter_id, value, recorded_at")
      .in("meter_id", meterIds)
      .order("recorded_at", { ascending: false });
    if (readError) errors.push(`Requête des relevés de compteur : ${readError.message}`);
    for (const r of readings ?? []) {
      if (!latestByMeter.has(r.meter_id)) latestByMeter.set(r.meter_id, r.value);
    }
  }

  for (const trigger of meterTriggers ?? []) {
    evaluated++;
    const latest = trigger.meter_id ? latestByMeter.get(trigger.meter_id) : undefined;
    if (latest == null || trigger.meter_interval == null) continue;

    const baseline = trigger.last_generated_meter_value ?? 0;
    const delta = latest - baseline;
    // gte: e.g. "every 250 h" on a cumulative meter — due once it has
    // accumulated at least meter_interval since the last generation.
    // lte: symmetric case for a decreasing/countdown-style meter — due once
    // it has dropped by at least meter_interval (interval given as a
    // positive magnitude, hence comparing against -meter_interval).
    // eq: exact match only — rare, and fragile with non-integer readings.
    let due = false;
    switch (trigger.meter_operator) {
      case "gte":
        due = delta >= trigger.meter_interval;
        break;
      case "lte":
        due = delta <= -trigger.meter_interval;
        break;
      case "eq":
        due = delta === trigger.meter_interval;
        break;
    }
    if (!due) continue;

    const { error: genError } = await admin.rpc("generate_pm_work_order", {
      p_trigger_id: trigger.id,
      p_occurrence: todayStr,
    });
    if (genError) {
      errors.push(`Déclencheur ${trigger.id} : ${genError.message}`);
      continue;
    }
    generated++;

    const { error: updError } = await admin
      .from("pm_triggers")
      .update({ last_generated_meter_value: latest })
      .eq("id", trigger.id);
    if (updError) errors.push(`Déclencheur ${trigger.id} : échec de la mise à jour de last_generated_meter_value (${updError.message})`);
  }

  return NextResponse.json({ evaluated, generated, errors });
}
