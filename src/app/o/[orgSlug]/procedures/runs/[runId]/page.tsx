import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import type { FieldConfig, FileAnswerValue, ProcedureFieldType } from "@/lib/procedures/field-logic";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "En cours",
  completed: "Terminé",
  failed: "Échec",
};
const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline"> = {
  in_progress: "outline",
  completed: "success",
  failed: "destructive",
};

function formatAnswer(type: ProcedureFieldType, config: FieldConfig, value: unknown): string {
  if (value === null || value === undefined) return "—";
  switch (type) {
    case "checkbox":
      return value === true ? "Coché" : "Non coché";
    case "yesno":
      return value === "yes" ? "Oui" : value === "no" ? "Non" : "—";
    case "pass_fail":
      return value === "pass" ? "Conforme" : value === "fail" ? "Non conforme" : "—";
    case "multiple_choice":
      return typeof value === "string" ? value : "—";
    case "number":
    case "meter_reading":
    case "amount_range":
      return typeof value === "number" ? `${value}${config.unit ? ` ${config.unit}` : ""}` : "—";
    case "datetime":
      return typeof value === "string" && value ? new Date(value).toLocaleString("fr-CA") : "—";
    case "text":
    case "free_text":
      return typeof value === "string" && value ? value : "—";
    default:
      return "—";
  }
}

export default async function ProcedureRunReportPage({ params }: PageProps<"/o/[orgSlug]/procedures/runs/[runId]">) {
  const { orgSlug, runId } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("procedure_runs")
    .select(
      "*, procedure_templates(name), equipment(id, name), profiles:started_by(full_name)",
    )
    .eq("id", runId)
    .eq("org_id", ctx.org.id)
    .maybeSingle();
  if (!run) notFound();

  const [{ data: fields }, { data: answerRows }] = await Promise.all([
    supabase.from("procedure_fields").select("*").eq("template_id", run.template_id).order("order_index"),
    supabase.from("procedure_run_answers").select("*").eq("run_id", runId),
  ]);

  const answerByField = new Map((answerRows ?? []).map((a) => [a.field_id, a]));

  // Signed URLs for photo/signature/file answers — the bucket is private.
  const fileFieldIds = (fields ?? [])
    .filter((f) => ["photo", "signature", "file"].includes(f.type))
    .map((f) => f.id);
  const signedUrls = new Map<string, string>();
  await Promise.all(
    fileFieldIds.map(async (fieldId) => {
      const answer = answerByField.get(fieldId);
      const path = (answer?.value as FileAnswerValue | null)?.path;
      if (!path) return;
      const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
      if (data?.signedUrl) signedUrls.set(fieldId, data.signedUrl);
    }),
  );

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{run.procedure_templates?.name ?? "Procédure"}</h1>
          <p className="text-muted-foreground">
            {run.equipment ? (
              <Link href={`/o/${orgSlug}/equipment/${run.equipment.id}`} className="hover:underline">
                {run.equipment.name}
              </Link>
            ) : (
              "Aucun équipement"
            )}
            {" · "}
            {run.profiles?.full_name ?? "Utilisateur"}
            {" · "}
            {new Date(run.started_at).toLocaleString("fr-CA")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>{STATUS_LABELS[run.status] ?? run.status}</Badge>
          {run.score != null && <Badge variant="outline">Score : {Math.round(Number(run.score))}%</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4">
          {(fields ?? []).length === 0 && <p className="py-6 text-center text-muted-foreground">Aucun résultat.</p>}

          {(fields ?? []).map((field) => {
            if (field.type === "section") {
              return (
                <h2 key={field.id} className="mt-3 border-b pb-1 pt-2 text-sm font-bold uppercase tracking-wide first:mt-0">
                  {field.label}
                </h2>
              );
            }
            if (field.type === "instructions") {
              return (
                <p key={field.id} className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground">
                  {field.label}
                </p>
              );
            }

            const answer = answerByField.get(field.id);
            const config = (field.config ?? {}) as FieldConfig;
            const type = field.type as ProcedureFieldType;
            const signedUrl = signedUrls.get(field.id);
            const fileValue = answer?.value as FileAnswerValue | null;

            return (
              <div key={field.id} className="flex items-start justify-between gap-4 border-b py-2 text-sm last:border-b-0">
                <span className="text-muted-foreground">{field.label}</span>
                <div className="flex max-w-[65%] flex-col items-end gap-1 text-right">
                  {(type === "photo" || type === "signature") && signedUrl ? (
                    <a href={signedUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signedUrl} alt={field.label} className="max-h-32 rounded-md border" />
                    </a>
                  ) : type === "file" && signedUrl ? (
                    <a href={signedUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {fileValue?.fileName ?? "Fichier"}
                    </a>
                  ) : type === "pass_fail" ? (
                    <Badge variant={answer?.value === "fail" ? "destructive" : answer?.value === "pass" ? "success" : "outline"}>
                      {formatAnswer(type, config, answer?.value)}
                    </Badge>
                  ) : (
                    <span className="font-medium">{formatAnswer(type, config, answer?.value)}</span>
                  )}
                  {answer?.flagged && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <Flag className="size-3" fill="currentColor" /> Signalé
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
