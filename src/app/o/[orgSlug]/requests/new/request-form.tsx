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
import { createRequestAction } from "@/lib/actions/requests";
import { REQUEST_URGENCY, requestSchema, type RequestFormValues } from "@/lib/validation/requests";
import type { Tables } from "@/types/supabase-helpers";

const URGENCY_LABELS: Record<(typeof REQUEST_URGENCY)[number], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export function RequestForm({
  orgSlug,
  orgId,
  equipmentOptions,
  defaultEquipmentId,
}: {
  orgSlug: string;
  orgId: string;
  equipmentOptions: Pick<Tables<"equipment">, "id" | "name">[];
  defaultEquipmentId?: string;
}) {
  const router = useRouter();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      equipmentId: defaultEquipmentId ?? null,
      locationId: null,
      category: "",
      urgency: "medium",
      isEquipmentDown: false,
      submit: true,
    },
  });

  async function onSubmit(values: RequestFormValues, submit: boolean) {
    const result = await createRequestAction(orgSlug, orgId, { ...values, submit });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(submit ? "Demande soumise." : "Brouillon enregistré.");
    router.push(`/o/${orgSlug}/requests/${result.data!.id}`);
  }

  return (
    <Form {...form}>
      <form className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle demande de maintenance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : Bruit anormal sur le convoyeur A1" autoFocus />
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
                  <FormLabel>Description du problème</FormLabel>
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
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Équipement</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex. : Mécanique, Électrique…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgence</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REQUEST_URGENCY.map((u) => (
                          <SelectItem key={u} value={u}>
                            {URGENCY_LABELS[u]}
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
                name="isEquipmentDown"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 self-end">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">L’équipement est actuellement arrêté</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, false))}
          >
            Enregistrer comme brouillon
          </Button>
          <Button
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, true))}
          >
            Soumettre la demande
          </Button>
        </div>
      </form>
    </Form>
  );
}
