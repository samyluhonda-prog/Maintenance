"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertPmPlanAction } from "@/lib/actions/pm-plans";
import { PM_PLAN_STATUSES, pmPlanSchema, type PmPlanFormValues } from "@/lib/validation/pm-plans";
import { WORK_ORDER_PRIORITIES } from "@/lib/validation/work-orders";
import type { Tables } from "@/types/supabase-helpers";

const STATUS_LABELS: Record<(typeof PM_PLAN_STATUSES)[number], string> = {
  active: "Actif",
  paused: "En pause",
  archived: "Archivé",
};
const PRIORITY_LABELS: Record<(typeof WORK_ORDER_PRIORITIES)[number], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export function PmPlanForm({
  orgSlug,
  orgId,
  plan,
  equipmentOptions,
  procedureTemplateOptions,
  memberOptions,
}: {
  orgSlug: string;
  orgId: string;
  plan?: Tables<"pm_plans">;
  equipmentOptions: { id: string; name: string }[];
  procedureTemplateOptions: { id: string; name: string }[];
  memberOptions: { userId: string; fullName: string }[];
}) {
  const router = useRouter();

  const form = useForm<PmPlanFormValues>({
    resolver: zodResolver(pmPlanSchema),
    defaultValues: {
      id: plan?.id,
      name: plan?.name ?? "",
      equipmentId: plan?.equipment_id ?? "",
      procedureTemplateId: plan?.procedure_template_id ?? "",
      woTitle: plan?.wo_title ?? "",
      woDescription: plan?.wo_description ?? "",
      woPriority: (plan?.wo_priority as PmPlanFormValues["woPriority"]) ?? "medium",
      woEstimateHours: plan?.wo_estimate_hours ?? undefined,
      defaultAssigneeId: plan?.default_assignee_id ?? "",
      leadTimeDays: plan?.lead_time_days ?? 0,
      status: (plan?.status as PmPlanFormValues["status"]) ?? "active",
    },
  });

  async function onSubmit(values: PmPlanFormValues) {
    const result = await upsertPmPlanAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(plan ? "Plan mis à jour." : "Plan créé.");
    router.push(`/o/${orgSlug}/pm-plans/${result.data!.id}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nom du plan</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex. : Entretien mensuel — Convoyeur A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Équipement</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un équipement" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipmentOptions.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name}
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
              name="procedureTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modèle de procédure (facultatif)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {procedureTemplateOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PM_PLAN_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
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
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Délai de préparation (jours avant échéance)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} value={(field.value as number | string | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bon de travail généré</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="woTitle"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Titre du bon de travail</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : Inspection mensuelle" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="woDescription"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description (facultatif)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="woPriority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_ORDER_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABELS[p]}
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
              name="woEstimateHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures estimées</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.25" min="0" {...field} value={(field.value as number | string | null | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultAssigneeId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Assigné par défaut (facultatif)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {memberOptions.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
