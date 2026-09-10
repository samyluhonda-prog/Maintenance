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
import { Switch } from "@/components/ui/switch";
import { upsertMeterAction } from "@/lib/actions/meters";
import { METER_KINDS, METER_SOURCES, meterSchema, type MeterFormValues } from "@/lib/validation/meters";
import type { Tables } from "@/types/supabase-helpers";

const KIND_LABELS: Record<(typeof METER_KINDS)[number], string> = {
  hours: "Heures",
  kilometers: "Kilomètres",
  cycles: "Cycles",
  pressure: "Pression",
  temperature: "Température",
  vibration: "Vibration",
  energy: "Énergie",
  weight: "Poids",
  production: "Production",
  custom: "Personnalisé",
};

const SOURCE_LABELS: Record<(typeof METER_SOURCES)[number], string> = {
  manual: "Manuelle",
  api: "API",
  sensor: "Capteur",
};

export function MeterForm({
  orgSlug,
  orgId,
  meter,
  equipmentOptions,
  defaultEquipmentId,
}: {
  orgSlug: string;
  orgId: string;
  meter?: Tables<"meters">;
  equipmentOptions: { id: string; name: string }[];
  defaultEquipmentId?: string;
}) {
  const router = useRouter();

  const form = useForm<MeterFormValues>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      id: meter?.id,
      equipmentId: meter?.equipment_id ?? defaultEquipmentId ?? "",
      name: meter?.name ?? "",
      unit: meter?.unit ?? "",
      kind: (meter?.kind as MeterFormValues["kind"]) ?? "hours",
      source: (meter?.source as MeterFormValues["source"]) ?? "manual",
      isCumulative: meter?.is_cumulative ?? true,
    },
  });

  async function onSubmit(values: MeterFormValues) {
    const result = await upsertMeterAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(meter ? "Compteur mis à jour." : "Compteur créé.");
    router.push(`/o/${orgSlug}/meters/${result.data!.id}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compteur</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="equipmentId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex. : Compteur horaire moteur" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : h, km, cycles" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
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
                      {METER_KINDS.map((k) => (
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
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METER_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_LABELS[s]}
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
              name="isCumulative"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 sm:col-span-2">
                  <div>
                    <FormLabel>Compteur cumulatif</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Active : la valeur ne fait qu’augmenter (ex. heures moteur). Désactive pour une valeur qui peut
                      redescendre (ex. niveau, jauge).
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
