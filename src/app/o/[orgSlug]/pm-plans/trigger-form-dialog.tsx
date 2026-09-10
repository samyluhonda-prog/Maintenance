"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { upsertPmTriggerAction } from "@/lib/actions/pm-plans";
import {
  METER_OPERATORS,
  PM_FREQUENCY_UNITS,
  PM_TRIGGER_KINDS,
  pmTriggerSchema,
  type PmTriggerFormValues,
} from "@/lib/validation/pm-plans";
import type { Tables } from "@/types/supabase-helpers";

const KIND_LABELS: Record<(typeof PM_TRIGGER_KINDS)[number], string> = {
  calendar: "Calendrier",
  meter: "Compteur",
  condition: "Condition personnalisée",
};
const FREQUENCY_UNIT_LABELS: Record<(typeof PM_FREQUENCY_UNITS)[number], string> = {
  day: "Jour(s)",
  week: "Semaine(s)",
  month: "Mois",
  year: "Année(s)",
  custom: "Jours de la semaine précis",
};
const OPERATOR_LABELS: Record<(typeof METER_OPERATORS)[number], string> = {
  gte: "Atteint ou dépasse (≥)",
  lte: "Diminue d’au moins (≤)",
  eq: "Égal exactement (=)",
};
const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export function TriggerFormDialog({
  orgSlug,
  orgId,
  pmPlanId,
  meters,
  trigger,
  triggerButton,
}: {
  orgSlug: string;
  orgId: string;
  pmPlanId: string;
  meters: Tables<"meters">[];
  trigger?: Tables<"pm_triggers">;
  triggerButton: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<PmTriggerFormValues>({
    resolver: zodResolver(pmTriggerSchema),
    defaultValues: {
      id: trigger?.id,
      kind: (trigger?.kind as PmTriggerFormValues["kind"]) ?? "calendar",
      frequencyUnit: (trigger?.frequency_unit as PmTriggerFormValues["frequencyUnit"]) ?? "month",
      frequencyValue: trigger?.frequency_value ?? 1,
      daysOfWeek: trigger?.days_of_week ?? [],
      fixedInterval: trigger?.fixed_interval ?? true,
      toleranceDays: trigger?.tolerance_days ?? 0,
      meterId: trigger?.meter_id ?? "",
      meterInterval: trigger?.meter_interval ?? undefined,
      meterOperator: (trigger?.meter_operator as PmTriggerFormValues["meterOperator"]) ?? "gte",
      conditionExpression: trigger?.condition_expression ? JSON.stringify(trigger.condition_expression, null, 2) : "",
      isActive: trigger?.is_active ?? true,
    },
  });

  const kind = form.watch("kind");
  const frequencyUnit = form.watch("frequencyUnit");
  const daysOfWeek = form.watch("daysOfWeek") ?? [];

  function toggleDay(day: number) {
    const current = form.getValues("daysOfWeek") ?? [];
    form.setValue("daysOfWeek", current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort());
  }

  async function onSubmit(values: PmTriggerFormValues) {
    const result = await upsertPmTriggerAction(orgSlug, orgId, pmPlanId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(trigger ? "Déclencheur mis à jour." : "Déclencheur ajouté.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trigger ? "Modifier le déclencheur" : "Nouveau déclencheur"}</DialogTitle>
          <DialogDescription>
            Un plan peut avoir plusieurs déclencheurs (ex. « tous les 6 mois OU tous les 2000 h, selon la première
            échéance »).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de déclencheur</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PM_TRIGGER_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {kind === "calendar" && (
              <div className="grid gap-4 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequencyValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tous les</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} value={(field.value as number | string | null | undefined) ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frequencyUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unité</FormLabel>
                        <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PM_FREQUENCY_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {FREQUENCY_UNIT_LABELS[u]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {frequencyUnit === "custom" && (
                  <div className="grid gap-1.5">
                    <FormLabel>Jours de la semaine</FormLabel>
                    <div className="flex gap-2">
                      {DAY_LABELS.map((label, day) => (
                        <label key={day} className="flex flex-col items-center gap-1 text-xs">
                          <Checkbox checked={daysOfWeek.includes(day)} onCheckedChange={() => toggleDay(day)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="toleranceDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolérance (jours)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} value={(field.value as number | string | null | undefined) ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fixedInterval"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-end">
                        <FormLabel>Cadence fixe</FormLabel>
                        <FormControl>
                          <div className="flex h-9 items-center">
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadence fixe : la prochaine échéance est calculée à partir de la précédente échéance (calendrier
                  régulier). Désactivée : la cadence est flottante — calculée à partir de la fin du dernier bon de
                  travail (nécessite une clôture pour avancer).
                </p>
              </div>
            )}

            {kind === "meter" && (
              <div className="grid gap-4 rounded-md border p-3">
                <FormField
                  control={form.control}
                  name="meterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compteur</FormLabel>
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un compteur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {meters.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {meters.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Aucun compteur sur cet équipement — créez-en un d’abord.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="meterInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalle</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" min="0" {...field} value={(field.value as number | string | null | undefined) ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meterOperator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opérateur</FormLabel>
                        <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {METER_OPERATORS.map((op) => (
                              <SelectItem key={op} value={op}>
                                {OPERATOR_LABELS[op]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {kind === "condition" && (
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Avancé, rare : expression JSON libre destinée à des règles alimentées par une API ou un capteur (pas
                  encore évaluée automatiquement).
                </p>
                <FormField
                  control={form.control}
                  name="conditionExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expression (JSON)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={5} className="font-mono text-xs" placeholder='{"metric": "vibration", "operator": "gt", "value": 5}' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <FormLabel>Déclencheur actif</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

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
