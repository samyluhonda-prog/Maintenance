"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, Copy, PlayCircle, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  deleteProcedureFieldAction,
  deleteProcedureTemplateAction,
  duplicateProcedureTemplateAction,
  reorderProcedureFieldAction,
  updateProcedureTemplateAction,
} from "@/lib/actions/procedures";
import type { Tables } from "@/types/supabase-helpers";

import { FIELD_TYPE_LABELS, FieldFormDialog } from "./field-form-dialog";

type Template = Tables<"procedure_templates">;
type ProcedureField = Tables<"procedure_fields">;

/** For each field, whether it sits under a preceding section header (purely presentational — sections aren't stored via `section_id`, grouping is derived from order alone). */
function computeIndentFlags(fields: ProcedureField[]): boolean[] {
  let sawSection = false;
  return fields.map((f) => {
    if (f.type === "section") {
      sawSection = true;
      return false;
    }
    return sawSection;
  });
}

export function ProcedureBuilder({
  orgSlug,
  orgId,
  template,
  fields,
  canEdit,
  canDelete,
  canDuplicate,
}: {
  orgSlug: string;
  orgId: string;
  template: Template;
  fields: ProcedureField[];
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggleActive(nextActive: boolean) {
    startTransition(async () => {
      const result = await updateProcedureTemplateAction(orgSlug, template.id, {
        name: template.name,
        description: template.description ?? "",
        category: template.category ?? "",
        isActive: nextActive,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(nextActive ? "Procédure activée." : "Procédure désactivée.");
        router.refresh();
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateProcedureTemplateAction(orgSlug, orgId, template.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Procédure dupliquée.");
        router.push(`/o/${orgSlug}/procedures/${result.data!.id}`);
      }
    });
  }

  function handleDeleteTemplate() {
    startTransition(async () => {
      const result = await deleteProcedureTemplateAction(orgSlug, template.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Procédure supprimée.");
        router.push(`/o/${orgSlug}/procedures`);
      }
    });
  }

  function handleDeleteField(fieldId: string) {
    startTransition(async () => {
      const result = await deleteProcedureFieldAction(orgSlug, template.id, fieldId);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const other = fields[index + direction];
    const current = fields[index];
    if (!other) return;
    startTransition(async () => {
      const result = await reorderProcedureFieldAction(orgSlug, template.id, current.id, other.id);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  const indentFlags = computeIndentFlags(fields);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <Badge variant={template.is_active ? "success" : "secondary"}>{template.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-muted-foreground">
            {template.category ?? "Sans catégorie"} · v{template.version}
          </p>
          {template.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{template.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/o/${orgSlug}/procedures/${template.id}/run`}>
              <PlayCircle /> Lancer une inspection
            </Link>
          </Button>
          {canEdit && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Settings2 className="size-4 text-muted-foreground" />
              <span>Active</span>
              <Switch checked={template.is_active} onCheckedChange={handleToggleActive} disabled={pending} />
            </div>
          )}
          {canDuplicate && (
            <Button variant="outline" onClick={handleDuplicate} disabled={pending}>
              <Copy /> Dupliquer
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer « {template.name} » ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera aussi tous les champs de cette procédure. Les inspections déjà réalisées
                    avec ce modèle ne sont pas supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTemplate}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-2 py-4">
          {fields.length === 0 && <p className="py-6 text-center text-muted-foreground">Aucun champ pour le moment.</p>}

          {fields.map((f, index) => {
            const isSection = f.type === "section";
            const indented = indentFlags[index];

            return (
              <div
                key={f.id}
                className={
                  isSection
                    ? "mt-3 border-b pb-1 pt-2 first:mt-0"
                    : `flex items-center gap-2 rounded-md border p-2 ${indented ? "ml-4" : ""}`
                }
              >
                {isSection ? (
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{f.label}</h2>
                    {canEdit && <FieldRowActions orgSlug={orgSlug} orgId={orgId} templateId={template.id} field={f} fields={fields} index={index} onMove={handleMove} onDelete={handleDeleteField} pending={pending} />}
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{f.label}</span>
                        {f.is_required && (
                          <span className="text-xs text-destructive" title="Obligatoire">
                            *
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {FIELD_TYPE_LABELS[f.type as keyof typeof FIELD_TYPE_LABELS] ?? f.type}
                      </span>
                    </div>
                    {canEdit && (
                      <FieldRowActions orgSlug={orgSlug} orgId={orgId} templateId={template.id} field={f} fields={fields} index={index} onMove={handleMove} onDelete={handleDeleteField} pending={pending} />
                    )}
                  </>
                )}
              </div>
            );
          })}

          {canEdit && (
            <FieldFormDialog
              orgSlug={orgSlug}
              orgId={orgId}
              templateId={template.id}
              earlierFields={fields}
              trigger={
                <Button variant="outline" className="mt-2 justify-self-start">
                  <Plus /> Ajouter un champ
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldRowActions({
  orgSlug,
  orgId,
  templateId,
  field,
  fields,
  index,
  onMove,
  onDelete,
  pending,
}: {
  orgSlug: string;
  orgId: string;
  templateId: string;
  field: ProcedureField;
  fields: ProcedureField[];
  index: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onDelete: (fieldId: string) => void;
  pending: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon" className="size-7" disabled={index === 0 || pending} onClick={() => onMove(index, -1)}>
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index === fields.length - 1 || pending}
        onClick={() => onMove(index, 1)}
      >
        <ArrowDown className="size-3.5" />
      </Button>
      <FieldFormDialog
        orgSlug={orgSlug}
        orgId={orgId}
        templateId={templateId}
        field={field}
        earlierFields={fields.filter((f) => f.order_index < field.order_index)}
        trigger={
          <Button variant="ghost" size="icon" className="size-7">
            <Settings2 className="size-3.5" />
          </Button>
        }
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 text-destructive">
            <Trash2 className="size-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {field.label} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {field.type === "section"
                ? "Les champs sous cette section ne seront pas supprimés, seulement le titre."
                : "Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(field.id)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
