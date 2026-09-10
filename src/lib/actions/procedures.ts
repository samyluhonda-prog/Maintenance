"use server";

import { revalidatePath } from "next/cache";

import {
  computeScore,
  hasFailedPassFail,
  isAnswerEmpty,
  isFieldVisible,
  NON_ANSWERABLE_TYPES,
  type FieldConfig,
  type ProcedureFieldType,
  type ScoreField,
} from "@/lib/procedures/field-logic";
import { createClient } from "@/lib/supabase/server";
import { procedureFieldSchema, procedureTemplateSchema } from "@/lib/validation/procedures";
import type { Json } from "@/types/database";
import type { Tables } from "@/types/supabase-helpers";

import { toActionError, type ActionState } from "./action-utils";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function createProcedureTemplateAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = procedureTemplateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data, error } = await supabase
    .from("procedure_templates")
    .insert({
      org_id: orgId,
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/procedures`);
  return { data: { id: data.id } };
}

/** Also used to toggle `is_active` — the builder passes the template's current fields back unchanged alongside the flipped flag. */
export async function updateProcedureTemplateAction(
  orgSlug: string,
  templateId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = procedureTemplateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("procedure_templates")
    .update({
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    })
    .eq("id", templateId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/procedures/${templateId}`);
  revalidatePath(`/o/${orgSlug}/procedures`);
  return {};
}

/**
 * Clones a template and every one of its fields as a brand-new template.
 * `version` resets to 1 (this is a fresh, independently-editable template —
 * not a new revision of the original) and the name gets a " (copie)" suffix.
 * Field ids are regenerated so `config.condition.field_id` references get
 * remapped onto the new fields (a raw copy would otherwise point conditions
 * at the *original* template's field ids).
 */
export async function duplicateProcedureTemplateAction(
  orgSlug: string,
  orgId: string,
  templateId: string,
): Promise<ActionState<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: template } = await supabase
    .from("procedure_templates")
    .select("*")
    .eq("id", templateId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!template) return { error: "Modèle introuvable." };

  const { data: fields } = await supabase
    .from("procedure_fields")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");

  const { data: newTemplate, error: templateError } = await supabase
    .from("procedure_templates")
    .insert({
      org_id: orgId,
      name: `${template.name} (copie)`,
      description: template.description,
      category: template.category,
      version: 1,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (templateError) return { error: toActionError(templateError) };

  if (fields && fields.length > 0) {
    const idMap = new Map<string, string>(fields.map((f) => [f.id, crypto.randomUUID()]));

    const rows = fields.map((f) => {
      const config = (f.config ?? {}) as FieldConfig;
      const condition =
        config.condition && idMap.has(config.condition.field_id)
          ? { ...config.condition, field_id: idMap.get(config.condition.field_id)! }
          : undefined;
      return {
        id: idMap.get(f.id)!,
        org_id: orgId,
        template_id: newTemplate.id,
        section_id: null, // grouping is derived from order_index in the builder UI, not stored
        order_index: f.order_index,
        type: f.type,
        label: f.label,
        is_required: f.is_required,
        config: { ...config, condition } as Json,
      };
    });

    const { error: fieldsError } = await supabase.from("procedure_fields").insert(rows);
    if (fieldsError) {
      await supabase.from("procedure_templates").delete().eq("id", newTemplate.id);
      return { error: toActionError(fieldsError) };
    }
  }

  revalidatePath(`/o/${orgSlug}/procedures`);
  return { data: { id: newTemplate.id } };
}

export async function deleteProcedureTemplateAction(orgSlug: string, templateId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("procedure_templates").delete().eq("id", templateId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/procedures`);
  return {};
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

function buildFieldConfig(input: {
  type: ProcedureFieldType;
  options?: string[];
  unit?: string;
  min?: number | null;
  max?: number | null;
  condition?: { fieldId: string; operator: "eq" | "neq"; value: string } | null;
  id?: string;
}): Json {
  const config: FieldConfig = {};

  if (input.type === "multiple_choice") {
    config.options = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  }
  if (input.type === "number" || input.type === "meter_reading") {
    if (input.unit) config.unit = input.unit.trim();
  }
  if (input.type === "number" || input.type === "meter_reading" || input.type === "amount_range") {
    if (input.min != null) config.min = input.min;
    if (input.max != null) config.max = input.max;
  }
  if (input.condition && input.condition.fieldId !== input.id) {
    config.condition = { field_id: input.condition.fieldId, operator: input.condition.operator, value: input.condition.value };
  }

  return config as Json;
}

export async function upsertProcedureFieldAction(
  orgSlug: string,
  orgId: string,
  templateId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = procedureFieldSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const isRequired = NON_ANSWERABLE_TYPES.has(input.type) ? false : input.isRequired;
  const config = buildFieldConfig(input);

  if (input.id) {
    const { error } = await supabase
      .from("procedure_fields")
      .update({ type: input.type, label: input.label, is_required: isRequired, config })
      .eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/procedures/${templateId}`);
    return { data: { id: input.id } };
  }

  const { data: last } = await supabase
    .from("procedure_fields")
    .select("order_index")
    .eq("template_id", templateId)
    .order("order_index", { ascending: false })
    .limit(1);
  const nextOrderIndex = (last?.[0]?.order_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("procedure_fields")
    .insert({
      org_id: orgId,
      template_id: templateId,
      order_index: nextOrderIndex,
      type: input.type,
      label: input.label,
      is_required: isRequired,
      config,
    })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/procedures/${templateId}`);
  return { data: { id: data.id } };
}

export async function deleteProcedureFieldAction(orgSlug: string, templateId: string, fieldId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("procedure_fields").delete().eq("id", fieldId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/procedures/${templateId}`);
  return {};
}

/** Swaps `order_index` between two fields of the same template — the whole reordering primitive the builder needs (up/down arrows). */
export async function reorderProcedureFieldAction(
  orgSlug: string,
  templateId: string,
  fieldAId: string,
  fieldBId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: rows, error: fetchError } = await supabase
    .from("procedure_fields")
    .select("id, order_index")
    .in("id", [fieldAId, fieldBId]);
  if (fetchError) return { error: toActionError(fetchError) };

  const a = rows?.find((r) => r.id === fieldAId);
  const b = rows?.find((r) => r.id === fieldBId);
  if (!a || !b) return { error: "Champ introuvable." };

  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from("procedure_fields").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("procedure_fields").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  if (errorA) return { error: toActionError(errorA) };
  if (errorB) return { error: toActionError(errorB) };

  revalidatePath(`/o/${orgSlug}/procedures/${templateId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Read-only bootstrap for the reusable `<ProcedureRun>` component: it's given
 * only ids as props (see procedure-run.tsx) so it can be dropped into any
 * page (standalone route, work-order detail, …) — this is what lets it
 * resolve the template/fields/existing-run/answers itself on mount instead of
 * requiring every caller to pre-fetch and thread that data down.
 */
export async function getProcedureRunBootstrapAction(
  orgId: string,
  templateId: string,
  existingRunId?: string | null,
): Promise<
  ActionState<{
    template: Pick<Tables<"procedure_templates">, "id" | "name" | "description" | "is_active">;
    fields: Tables<"procedure_fields">[];
    run: Tables<"procedure_runs"> | null;
    answers: Tables<"procedure_run_answers">[];
  }>
> {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("procedure_templates")
    .select("id, name, description, is_active")
    .eq("id", templateId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!template) return { error: "Modèle introuvable." };

  const { data: fields } = await supabase
    .from("procedure_fields")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");

  let run: Tables<"procedure_runs"> | null = null;
  let answers: Tables<"procedure_run_answers">[] = [];
  if (existingRunId) {
    const { data: runRow } = await supabase
      .from("procedure_runs")
      .select("*")
      .eq("id", existingRunId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!runRow) return { error: "Inspection introuvable." };
    run = runRow;

    const { data: answerRows } = await supabase.from("procedure_run_answers").select("*").eq("run_id", existingRunId);
    answers = answerRows ?? [];
  }

  return { data: { template, fields: fields ?? [], run, answers } };
}

export async function startProcedureRunAction(
  orgId: string,
  input: { templateId: string; workOrderId?: string | null; equipmentId?: string | null },
): Promise<ActionState<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data, error } = await supabase
    .from("procedure_runs")
    .insert({
      org_id: orgId,
      template_id: input.templateId,
      work_order_id: input.workOrderId || null,
      equipment_id: input.equipmentId || null,
      status: "in_progress",
      started_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };
  return { data: { id: data.id } };
}

export async function saveProcedureAnswerAction(
  orgId: string,
  runId: string,
  fieldId: string,
  value: Json | null,
  flagged: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("procedure_run_answers")
    .upsert({ org_id: orgId, run_id: runId, field_id: fieldId, value, flagged }, { onConflict: "run_id,field_id" });
  if (error) return { error: toActionError(error) };
  return {};
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

/** Handles photo/file/signature answers: uploads to the shared `documents` bucket, then saves `{path, fileName}` as the answer's value (preserving any existing `flagged` state). */
export async function uploadProcedureAnswerFileAction(
  orgId: string,
  runId: string,
  fieldId: string,
  formData: FormData,
): Promise<ActionState<{ path: string; fileName: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse la taille maximale de 15 Mo." };
  if (!ALLOWED_MIME.has(file.type)) return { error: "Type de fichier non autorisé (images ou PDF seulement)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/procedure-runs/${runId}/${fieldId}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { data: existing } = await supabase
    .from("procedure_run_answers")
    .select("flagged")
    .eq("run_id", runId)
    .eq("field_id", fieldId)
    .maybeSingle();

  const { error: saveError } = await supabase.from("procedure_run_answers").upsert(
    {
      org_id: orgId,
      run_id: runId,
      field_id: fieldId,
      value: { path, fileName: file.name } as Json,
      flagged: existing?.flagged ?? false,
    },
    { onConflict: "run_id,field_id" },
  );
  if (saveError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: toActionError(saveError) };
  }

  return { data: { path, fileName: file.name } };
}

/**
 * Closes an in-progress run: re-validates required/visible fields server-side
 * (defense-in-depth — the client already blocks this), computes `score` and
 * `status` per the documented formula, and stamps `completed_at`.
 */
export async function completeProcedureRunAction(
  orgSlug: string,
  runId: string,
): Promise<ActionState<{ status: "completed" | "failed"; score: number }>> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("procedure_runs")
    .select("id, template_id, equipment_id, status")
    .eq("id", runId)
    .maybeSingle();
  if (!run) return { error: "Inspection introuvable." };
  if (run.status !== "in_progress") return { error: "Cette inspection est déjà terminée." };

  const { data: fields } = await supabase
    .from("procedure_fields")
    .select("id, type, is_required, label, config")
    .eq("template_id", run.template_id)
    .order("order_index");
  const { data: answerRows } = await supabase
    .from("procedure_run_answers")
    .select("field_id, value, flagged")
    .eq("run_id", runId);

  const answers = new Map<string, unknown>((answerRows ?? []).map((a) => [a.field_id, a.value]));
  const flaggedAny = (answerRows ?? []).some((a) => a.flagged);

  const missing = (fields ?? []).filter((f) => {
    const type = f.type as ProcedureFieldType;
    if (!f.is_required || NON_ANSWERABLE_TYPES.has(type)) return false;
    if (!isFieldVisible(f.config as FieldConfig, answers)) return false;
    return isAnswerEmpty(type, answers.get(f.id));
  });
  if (missing.length > 0) {
    return { error: `Champs requis manquants : ${missing.map((f) => f.label).join(", ")}.` };
  }

  const scoreFields: ScoreField[] = (fields ?? []).map((f) => ({
    id: f.id,
    type: f.type as ProcedureFieldType,
    config: f.config as FieldConfig,
  }));
  const score = computeScore(scoreFields, answers);
  const status = hasFailedPassFail(scoreFields, answers) || flaggedAny ? "failed" : "completed";

  const { error } = await supabase
    .from("procedure_runs")
    .update({ status, completed_at: new Date().toISOString(), score })
    .eq("id", runId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/procedures/runs/${runId}`);
  if (run.equipment_id) revalidatePath(`/o/${orgSlug}/equipment/${run.equipment_id}`);

  return { data: { status, score } };
}
