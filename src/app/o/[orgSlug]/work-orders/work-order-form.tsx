"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertWorkOrderAction } from "@/lib/actions/work-orders";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TYPES,
  workOrderSchema,
  type WorkOrderFormValues,
} from "@/lib/validation/work-orders";
import type { Tables } from "@/types/supabase-helpers";

const TYPE_LABELS: Record<(typeof WORK_ORDER_TYPES)[number], string> = {
  preventive: "Préventif",
  corrective: "Correctif",
  inspection: "Inspection",
  safety: "Sécurité",
  improvement: "Amélioration",
  other: "Autre",
};
const PRIORITY_LABELS: Record<(typeof WORK_ORDER_PRIORITIES)[number], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export function WorkOrderForm({
  orgSlug,
  orgId,
  workOrder,
  equipmentOptions,
  memberOptions,
  defaultEquipmentId,
  defaultTitle,
}: {
  orgSlug: string;
  orgId: string;
  workOrder?: Tables<"work_orders">;
  equipmentOptions: Pick<Tables<"equipment">, "id" | "name">[];
  memberOptions: { userId: string; fullName: string }[];
  defaultEquipmentId?: string;
  /** Prefills the title — used when arriving from a failed procedure run (`?procedureRunId=`). */
  defaultTitle?: string;
}) {
  const router = useRouter();

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      id: workOrder?.id,
      title: workOrder?.title ?? defaultTitle ?? "",
      description: workOrder?.description ?? "",
      type: (workOrder?.type as WorkOrderFormValues["type"]) ?? "corrective",
      priority: (workOrder?.priority as WorkOrderFormValues["priority"]) ?? "medium",
      equipmentId: workOrder?.equipment_id ?? defaultEquipmentId ?? null,
      locationId: workOrder?.location_id ?? null,
      primaryAssigneeId: workOrder?.primary_assignee_id ?? null,
      scheduledStart: workOrder?.scheduled_start?.slice(0, 16) ?? "",
      dueAt: workOrder?.due_at?.slice(0, 16) ?? "",
      estimateHours: workOrder?.estimate_hours ?? undefined,
      requiresLockout: workOrder?.requires_lockout ?? false,
      safetyNotes: workOrder?.safety_notes ?? "",
    },
  });

  async function onSubmit(values: WorkOrderFormValues) {
    const result = await upsertWorkOrderAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(workOrder ? "Bon de travail mis à jour." : "Bon de travail créé.");
    router.push(`/o/${orgSlug}/work-orders/${result.data!.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bon de travail</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORK_ORDER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_LABELS[t]}
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
                name="priority"
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
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Équipement</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
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
                name="primaryAssigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigné à</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
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
              <FormField
                control={form.control}
                name="scheduledStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début prévu</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Échéance</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimateHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heures estimées</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        {...field}
                        value={(field.value as number | string | null | undefined) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiresLockout"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 self-end">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Cadenassage requis</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="safetyNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consignes de sécurité</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
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
