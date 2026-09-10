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
import { upsertEquipmentAction } from "@/lib/actions/equipment";
import {
  EQUIPMENT_CRITICALITY,
  EQUIPMENT_STATUSES,
  equipmentSchema,
  type EquipmentFormValues,
} from "@/lib/validation/equipment";
import type { Tables } from "@/types/supabase-helpers";

const STATUS_LABELS: Record<(typeof EQUIPMENT_STATUSES)[number], string> = {
  operational: "En service",
  down: "Arrêté",
  in_repair: "En réparation",
  decommissioned: "Hors service",
  standby: "En attente",
};

const CRITICALITY_LABELS: Record<(typeof EQUIPMENT_CRITICALITY)[number], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export function EquipmentForm({
  orgSlug,
  orgId,
  equipment,
  locations,
  suppliers,
}: {
  orgSlug: string;
  orgId: string;
  equipment?: Tables<"equipment">;
  locations: Tables<"locations">[];
  suppliers: Tables<"suppliers">[];
}) {
  const router = useRouter();

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      id: equipment?.id,
      name: equipment?.name ?? "",
      internalCode: equipment?.internal_code ?? "",
      category: equipment?.category ?? "",
      status: (equipment?.status as EquipmentFormValues["status"]) ?? "operational",
      criticality: (equipment?.criticality as EquipmentFormValues["criticality"]) ?? "medium",
      manufacturer: equipment?.manufacturer ?? "",
      model: equipment?.model ?? "",
      serialNumber: equipment?.serial_number ?? "",
      locationId: equipment?.location_id ?? null,
      parentEquipmentId: equipment?.parent_equipment_id ?? null,
      supplierId: equipment?.supplier_id ?? null,
      commissionedAt: equipment?.commissioned_at ?? "",
      warrantyExpiresAt: equipment?.warranty_expires_at ?? "",
      acquisitionCost: equipment?.acquisition_cost ?? undefined,
      expectedLifetimeMonths: equipment?.expected_lifetime_months ?? undefined,
    },
  });

  async function onSubmit(values: EquipmentFormValues) {
    const result = await upsertEquipmentAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(equipment ? "Équipement mis à jour." : "Équipement créé.");
    router.push(`/o/${orgSlug}/equipment/${result.data!.id}`);
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
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="internalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identifiant interne</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : CONV-014" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : Convoyeur" />
                  </FormControl>
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
                      {EQUIPMENT_STATUSES.map((s) => (
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
              name="criticality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criticité</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EQUIPMENT_CRITICALITY.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CRITICALITY_LABELS[c]}
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
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emplacement</FormLabel>
                  <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
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

        <Card>
          <CardHeader>
            <CardTitle>Fabricant et acquisition</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabricant</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modèle</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de série</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur</FormLabel>
                  <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
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
              name="commissionedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de mise en service</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warrantyExpiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin de garantie</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acquisitionCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coût d’acquisition ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
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
              name="expectedLifetimeMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée de vie prévue (mois)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={(field.value as number | string | null | undefined) ?? ""}
                    />
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
