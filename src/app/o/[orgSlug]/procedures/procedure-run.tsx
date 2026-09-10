"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Eraser, Flag, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  completeProcedureRunAction,
  getProcedureRunBootstrapAction,
  saveProcedureAnswerAction,
  startProcedureRunAction,
  uploadProcedureAnswerFileAction,
} from "@/lib/actions/procedures";
import {
  isAnswerEmpty,
  isFieldVisible,
  NON_ANSWERABLE_TYPES,
  type FieldConfig,
  type FileAnswerValue,
  type ProcedureFieldType,
} from "@/lib/procedures/field-logic";
import type { Json } from "@/types/database";
import type { Tables } from "@/types/supabase-helpers";

type ProcedureField = Tables<"procedure_fields">;
type AnswerEntry = { value: unknown; flagged: boolean };

/**
 * Reusable inspection-execution UI. Given only ids as props, it resolves its
 * own data (template/fields, and an existing run's answers) on mount and
 * manages the whole answer/save/finish lifecycle — this is what lets it be
 * dropped both into the standalone `/procedures/[id]/run` route below and,
 * later, into the work-order detail page with no shared server-side fetch.
 */
export function ProcedureRun({
  orgSlug,
  orgId,
  templateId,
  workOrderId,
  equipmentId,
  existingRunId,
}: {
  orgSlug: string;
  orgId: string;
  templateId: string;
  workOrderId?: string;
  equipmentId?: string;
  existingRunId?: string;
}) {
  const initedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [template, setTemplate] = useState<Pick<Tables<"procedure_templates">, "id" | "name" | "description" | "is_active"> | null>(null);
  const [fields, setFields] = useState<ProcedureField[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const [attemptedFinish, setAttemptedFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<{ status: "completed" | "failed"; score: number } | null>(null);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    (async () => {
      const boot = await getProcedureRunBootstrapAction(orgId, templateId, existingRunId);
      if (boot.error || !boot.data) {
        setLoadError(boot.error ?? "Impossible de charger la procédure.");
        setLoading(false);
        return;
      }

      setTemplate(boot.data.template);
      setFields(boot.data.fields);

      if (boot.data.run) {
        const map: Record<string, AnswerEntry> = {};
        for (const a of boot.data.answers) map[a.field_id] = { value: a.value, flagged: a.flagged };
        setAnswers(map);
        if (boot.data.run.status !== "in_progress") {
          setRunId(boot.data.run.id);
          setResult({ status: boot.data.run.status as "completed" | "failed", score: Number(boot.data.run.score ?? 0) });
          setLoading(false);
          return;
        }
        setRunId(boot.data.run.id);
      } else {
        const started = await startProcedureRunAction(orgId, { templateId, workOrderId, equipmentId });
        if (started.error || !started.data) {
          setLoadError(started.error ?? "Impossible de démarrer l’inspection.");
          setLoading(false);
          return;
        }
        setRunId(started.data.id);
      }
      setLoading(false);
    })();
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answerValues = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const [fieldId, entry] of Object.entries(answers)) map.set(fieldId, entry.value);
    return map;
  }, [answers]);

  const visibleFields = useMemo(
    () => fields.filter((f) => isFieldVisible(f.config as FieldConfig, answerValues)),
    [fields, answerValues],
  );

  const missingRequired = useMemo(
    () =>
      visibleFields.filter((f) => {
        const type = f.type as ProcedureFieldType;
        if (!f.is_required || NON_ANSWERABLE_TYPES.has(type)) return false;
        return isAnswerEmpty(type, answers[f.id]?.value);
      }),
    [visibleFields, answers],
  );

  async function persistAnswer(fieldId: string, value: unknown, flagged: boolean) {
    if (!runId) return;
    const result2 = await saveProcedureAnswerAction(orgId, runId, fieldId, (value ?? null) as Json, flagged);
    if (result2.error) toast.error(result2.error);
  }

  function setLocalValue(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: { value, flagged: prev[fieldId]?.flagged ?? false } }));
  }

  function commitValue(fieldId: string) {
    const entry = answers[fieldId];
    void persistAnswer(fieldId, entry?.value ?? null, entry?.flagged ?? false);
  }

  function setImmediateValue(fieldId: string, value: unknown) {
    const flagged = answers[fieldId]?.flagged ?? false;
    setAnswers((prev) => ({ ...prev, [fieldId]: { value, flagged } }));
    void persistAnswer(fieldId, value, flagged);
  }

  function toggleFlag(fieldId: string) {
    const value = answers[fieldId]?.value ?? null;
    const flagged = !(answers[fieldId]?.flagged ?? false);
    setAnswers((prev) => ({ ...prev, [fieldId]: { value, flagged } }));
    void persistAnswer(fieldId, value, flagged);
  }

  async function handleFinish() {
    setAttemptedFinish(true);
    if (missingRequired.length > 0 || !runId) return;
    setFinishing(true);
    const res = await completeProcedureRunAction(orgSlug, runId);
    setFinishing(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Impossible de terminer l’inspection.");
      return;
    }
    setResult(res.data);
    toast.success(res.data.status === "failed" ? "Inspection terminée — échec détecté." : "Inspection terminée.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Chargement…
      </div>
    );
  }
  if (loadError || !template) {
    return <p className="py-10 text-center text-destructive">{loadError ?? "Erreur inconnue."}</p>;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
        {template.description && <p className="text-muted-foreground">{template.description}</p>}
      </div>

      {result ? (
        <Card className={result.status === "failed" ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"}>
          <CardContent className="grid gap-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.status === "failed" ? "destructive" : "success"}>
                {result.status === "failed" ? "Échec" : "Terminé"}
              </Badge>
              <span className="text-sm text-muted-foreground">Score : {result.score}%</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/o/${orgSlug}/procedures/runs/${runId}`}>Voir le rapport</Link>
              </Button>
              {result.status === "failed" && (
                <Button variant="destructive" asChild>
                  <Link
                    href={`/o/${orgSlug}/work-orders/new?procedureRunId=${runId}${equipmentId ? `&equipmentId=${equipmentId}` : ""}`}
                  >
                    Créer un bon de travail correctif
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {attemptedFinish && missingRequired.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-4 text-sm">
                <p className="mb-1 font-medium text-destructive">Champs requis manquants :</p>
                <ul className="list-inside list-disc text-destructive">
                  {missingRequired.map((f) => (
                    <li key={f.id}>{f.label}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="grid gap-3 py-4">
              {visibleFields.length === 0 && <p className="py-6 text-center text-muted-foreground">Aucun champ à remplir.</p>}
              {visibleFields.map((field) =>
                field.type === "section" ? (
                  <h2 key={field.id} className="mt-3 border-b pb-1 pt-2 text-sm font-bold uppercase tracking-wide first:mt-0">
                    {field.label}
                  </h2>
                ) : field.type === "instructions" ? (
                  <p key={field.id} className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground">
                    {field.label}
                  </p>
                ) : (
                  <AnswerRow
                    key={field.id}
                    orgId={orgId}
                    runId={runId!}
                    field={field}
                    entry={answers[field.id]}
                    onLocalChange={(v) => setLocalValue(field.id, v)}
                    onCommit={() => commitValue(field.id)}
                    onImmediate={(v) => setImmediateValue(field.id, v)}
                    onToggleFlag={() => toggleFlag(field.id)}
                    onFileUploaded={(v) => setAnswers((prev) => ({ ...prev, [field.id]: { value: v, flagged: prev[field.id]?.flagged ?? false } }))}
                  />
                ),
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleFinish} disabled={finishing}>
              {finishing ? "Enregistrement…" : "Terminer"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function AnswerRow({
  orgId,
  runId,
  field,
  entry,
  onLocalChange,
  onCommit,
  onImmediate,
  onToggleFlag,
  onFileUploaded,
}: {
  orgId: string;
  runId: string;
  field: ProcedureField;
  entry: AnswerEntry | undefined;
  onLocalChange: (value: unknown) => void;
  onCommit: () => void;
  onImmediate: (value: unknown) => void;
  onToggleFlag: () => void;
  onFileUploaded: (value: FileAnswerValue) => void;
}) {
  const type = field.type as ProcedureFieldType;
  const config = (field.config ?? {}) as FieldConfig;
  const value = entry?.value;
  const flagged = entry?.flagged ?? false;

  return (
    <div className="grid gap-1.5 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">
          {field.label}
          {field.is_required && <span className="ml-1 text-destructive">*</span>}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-7 shrink-0 ${flagged ? "text-destructive" : "text-muted-foreground"}`}
          title="Signaler un problème"
          onClick={onToggleFlag}
        >
          <Flag className="size-3.5" fill={flagged ? "currentColor" : "none"} />
        </Button>
      </div>

      <FieldInput
        type={type}
        config={config}
        value={value}
        orgId={orgId}
        runId={runId}
        fieldId={field.id}
        onLocalChange={onLocalChange}
        onCommit={onCommit}
        onImmediate={onImmediate}
        onFileUploaded={onFileUploaded}
      />
    </div>
  );
}

function FieldInput({
  type,
  config,
  value,
  orgId,
  runId,
  fieldId,
  onLocalChange,
  onCommit,
  onImmediate,
  onFileUploaded,
}: {
  type: ProcedureFieldType;
  config: FieldConfig;
  value: unknown;
  orgId: string;
  runId: string;
  fieldId: string;
  onLocalChange: (value: unknown) => void;
  onCommit: () => void;
  onImmediate: (value: unknown) => void;
  onFileUploaded: (value: FileAnswerValue) => void;
}) {
  switch (type) {
    case "checkbox":
      return <Checkbox checked={value === true} onCheckedChange={(v) => onImmediate(v === true)} />;

    case "yesno":
      return (
        <RadioGroup value={(value as string) ?? ""} onValueChange={onImmediate} className="flex flex-row gap-4">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Oui
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> Non
          </label>
        </RadioGroup>
      );

    case "pass_fail":
      return (
        <div className="flex gap-2">
          <Button type="button" variant={value === "pass" ? "success" : "outline"} onClick={() => onImmediate("pass")}>
            <CheckCircle2 /> Conforme
          </Button>
          <Button type="button" variant={value === "fail" ? "destructive" : "outline"} onClick={() => onImmediate("fail")}>
            <XCircle /> Non conforme
          </Button>
        </div>
      );

    case "multiple_choice":
      return (
        <RadioGroup value={(value as string) ?? ""} onValueChange={onImmediate} className="gap-2">
          {(config.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={opt} /> {opt}
            </label>
          ))}
        </RadioGroup>
      );

    case "number":
    case "meter_reading":
    case "amount_range": {
      const num = typeof value === "number" ? value : "";
      const outOfRange =
        typeof value === "number" && ((config.min != null && value < config.min) || (config.max != null && value > config.max));
      return (
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={num}
              min={config.min}
              max={config.max}
              onChange={(e) => onLocalChange(e.target.value === "" ? null : Number(e.target.value))}
              onBlur={onCommit}
              className="max-w-40"
            />
            {config.unit && <span className="text-sm text-muted-foreground">{config.unit}</span>}
          </div>
          {outOfRange && (
            <p className="text-xs text-warning">
              Hors de la plage recommandée{config.min != null ? ` (min ${config.min}` : " ("}
              {config.max != null ? `, max ${config.max})` : ")"}.
            </p>
          )}
        </div>
      );
    }

    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={(value as string) ?? ""}
          onChange={(e) => onLocalChange(e.target.value)}
          onBlur={onCommit}
          className="max-w-64"
        />
      );

    case "text":
    case "free_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onLocalChange(e.target.value)}
          onBlur={onCommit}
          rows={type === "text" ? 2 : 4}
        />
      );

    case "photo":
    case "file":
      return <FileUploadInput orgId={orgId} runId={runId} fieldId={fieldId} accept={type === "photo" ? "image/*" : undefined} value={value as FileAnswerValue | null} onUploaded={onFileUploaded} />;

    case "signature":
      return <SignaturePad orgId={orgId} runId={runId} fieldId={fieldId} value={value as FileAnswerValue | null} onSaved={onFileUploaded} />;

    default:
      return null;
  }
}

function FileUploadInput({
  orgId,
  runId,
  fieldId,
  accept,
  value,
  onUploaded,
}: {
  orgId: string;
  runId: string;
  fieldId: string;
  accept?: string;
  value: FileAnswerValue | null;
  onUploaded: (value: FileAnswerValue) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadProcedureAnswerFileAction(orgId, runId, fieldId, formData);
    setUploading(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Échec du téléversement.");
      return;
    }
    onUploaded(result.data);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? "image/*,application/pdf"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload /> {uploading ? "Téléversement…" : "Téléverser"}
      </Button>
      {value?.fileName && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-success" /> {value.fileName}
        </span>
      )}
    </div>
  );
}

function SignaturePad({
  orgId,
  runId,
  fieldId,
  value,
  onSaved,
}: {
  orgId: string;
  runId: string;
  fieldId: string;
  value: FileAnswerValue | null;
  onSaved: (value: FileAnswerValue) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setHasDrawn(true);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setSaving(false);
        toast.error("Impossible d’enregistrer la signature.");
        return;
      }
      const file = new File([blob], "signature.png", { type: "image/png" });
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadProcedureAnswerFileAction(orgId, runId, fieldId, formData);
      setSaving(false);
      if (result.error || !result.data) {
        toast.error(result.error ?? "Échec de l’enregistrement de la signature.");
        return;
      }
      onSaved(result.data);
      toast.success("Signature enregistrée.");
    }, "image/png");
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="max-w-full touch-none rounded-md border bg-background"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Eraser /> Effacer
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!hasDrawn || saving}>
          {saving ? "Enregistrement…" : "Enregistrer la signature"}
        </Button>
        {value?.path && !hasDrawn && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" /> Signature enregistrée
          </span>
        )}
      </div>
    </div>
  );
}
