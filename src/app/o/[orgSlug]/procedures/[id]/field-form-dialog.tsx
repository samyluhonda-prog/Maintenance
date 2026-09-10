"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertProcedureFieldAction } from "@/lib/actions/procedures";
import { NON_ANSWERABLE_TYPES, PROCEDURE_FIELD_TYPES, type FieldConfig } from "@/lib/procedures/field-logic";
import {
  conditionOperators,
  procedureFieldCoreSchema,
  procedureFieldSchema,
  type ProcedureFieldCoreFormValues,
} from "@/lib/validation/procedures";
import type { Tables } from "@/types/supabase-helpers";

export const FIELD_TYPE_LABELS: Record<(typeof PROCEDURE_FIELD_TYPES)[number], string> = {
  section: "Section (titre de regroupement)",
  text: "Texte (réponse courte)",
  instructions: "Instructions (lecture seule)",
  checkbox: "Case à cocher",
  yesno: "Oui / Non",
  multiple_choice: "Choix multiple",
  number: "Nombre",
  free_text: "Texte libre (réponse longue)",
  datetime: "Date et heure",
  meter_reading: "Relevé de compteur",
  pass_fail: "Conforme / Non conforme",
  photo: "Photo",
  signature: "Signature",
  file: "Fichier",
  amount_range: "Montant (plage de valeurs)",
};

const OPERATOR_LABELS: Record<(typeof conditionOperators)[number], string> = {
  eq: "est égal à",
  neq: "n’est pas égal à",
};

type ProcedureField = Tables<"procedure_fields">;

export function FieldFormDialog({
  orgSlug,
  orgId,
  templateId,
  field,
  earlierFields,
  trigger,
}: {
  orgSlug: string;
  orgId: string;
  templateId: string;
  field?: ProcedureField;
  earlierFields: ProcedureField[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const config = (field?.config ?? {}) as FieldConfig;

  const [options, setOptions] = useState<string[]>(config.options && config.options.length > 0 ? config.options : ["", ""]);
  const [conditionEnabled, setConditionEnabled] = useState(!!config.condition);
  const [conditionFieldId, setConditionFieldId] = useState(config.condition?.field_id ?? "");
  const [conditionOperator, setConditionOperator] = useState<"eq" | "neq">(config.condition?.operator ?? "eq");
  const [conditionValue, setConditionValue] = useState(config.condition?.value ?? "");

  const form = useForm<ProcedureFieldCoreFormValues>({
    resolver: zodResolver(procedureFieldCoreSchema),
    defaultValues: {
      type: (field?.type as ProcedureFieldCoreFormValues["type"]) ?? "text",
      label: field?.label ?? "",
      isRequired: field?.is_required ?? false,
      unit: config.unit ?? "",
      min: config.min ?? undefined,
      max: config.max ?? undefined,
    },
  });

  // Reset local (non-RHF) state whenever the dialog re-opens on a possibly different field.
  useEffect(() => {
    if (!open) return;
    form.reset({
      type: (field?.type as ProcedureFieldCoreFormValues["type"]) ?? "text",
      label: field?.label ?? "",
      isRequired: field?.is_required ?? false,
      unit: config.unit ?? "",
      min: config.min ?? undefined,
      max: config.max ?? undefined,
    });
    setOptions(config.options && config.options.length > 0 ? config.options : ["", ""]);
    setConditionEnabled(!!config.condition);
    setConditionFieldId(config.condition?.field_id ?? "");
    setConditionOperator(config.condition?.operator ?? "eq");
    setConditionValue(config.condition?.value ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const type = form.watch("type");
  const isAnswerable = !NON_ANSWERABLE_TYPES.has(type);
  const showOptions = type === "multiple_choice";
  const showMinMaxUnit = type === "number" || type === "meter_reading" || type === "amount_range";
  const showUnit = type === "number" || type === "meter_reading";
  const conditionCandidates = earlierFields.filter(
    (f) => f.id !== field?.id && !NON_ANSWERABLE_TYPES.has(f.type as (typeof PROCEDURE_FIELD_TYPES)[number]),
  );

  async function onSubmit(values: ProcedureFieldCoreFormValues) {
    const raw = {
      id: field?.id,
      type: values.type,
      label: values.label,
      isRequired: values.isRequired,
      options: showOptions ? options : undefined,
      unit: showUnit ? values.unit : undefined,
      min: showMinMaxUnit ? values.min : undefined,
      max: showMinMaxUnit ? values.max : undefined,
      condition: conditionEnabled && conditionFieldId ? { fieldId: conditionFieldId, operator: conditionOperator, value: conditionValue } : null,
    };

    const parsed = procedureFieldSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const result = await upsertProcedureFieldAction(orgSlug, orgId, templateId, parsed.data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(field ? "Champ mis à jour." : "Champ ajouté.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? "Modifier le champ" : "Ajouter un champ"}</DialogTitle>
          <DialogDescription>Choisissez un type de champ, puis ajustez ses options.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Type de champ</FormLabel>
                  <Select value={f.value} onValueChange={f.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROCEDURE_FIELD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>{type === "section" ? "Titre de la section" : type === "instructions" ? "Texte à afficher" : "Libellé"}</FormLabel>
                  <FormControl>
                    <Input {...f} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOptions && (
              <div className="grid gap-2">
                <FormLabel>Options</FormLabel>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                      placeholder={`Option ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={options.length <= 2}
                      onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setOptions((prev) => [...prev, ""])}>
                  <Plus /> Ajouter une option
                </Button>
              </div>
            )}

            {showMinMaxUnit && (
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="min"
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Minimum</FormLabel>
                      <FormControl>
                        <Input type="number" {...f} value={(f.value as number | string | null | undefined) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max"
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Maximum</FormLabel>
                      <FormControl>
                        <Input type="number" {...f} value={(f.value as number | string | null | undefined) ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showUnit && (
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Unité</FormLabel>
                        <FormControl>
                          <Input {...f} placeholder="Ex. : psi, °C" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {isAnswerable && (
              <FormField
                control={form.control}
                name="isRequired"
                render={({ field: f }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox checked={f.value} onCheckedChange={f.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Réponse obligatoire</FormLabel>
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={conditionEnabled}
                  onCheckedChange={(v) => setConditionEnabled(v === true)}
                  disabled={conditionCandidates.length === 0}
                />
                <span className="text-sm font-medium">
                  N’afficher que si… {conditionCandidates.length === 0 && "(aucun champ précédent disponible)"}
                </span>
              </div>
              {conditionEnabled && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select value={conditionFieldId} onValueChange={setConditionFieldId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Champ" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionCandidates.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={conditionOperator} onValueChange={(v) => setConditionOperator(v as "eq" | "neq")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOperators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {OPERATOR_LABELS[op]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="Valeur" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
