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
import { createRcaAction } from "@/lib/actions/rca";
import { rcaRecordSchema, type RcaRecordInput } from "@/lib/validation/rca";
import type { Tables } from "@/types/supabase-helpers";

export function RcaForm({
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
  const form = useForm<RcaRecordInput>({
    resolver: zodResolver(rcaRecordSchema),
    defaultValues: {
      title: "",
      problemStatement: "",
      equipmentId: defaultEquipmentId ?? "",
      workOrderId: null,
    },
  });

  async function onSubmit(values: RcaRecordInput) {
    const result = await createRcaAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Analyse créée.");
    router.push(`/o/${orgSlug}/rca/${result.data!.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle analyse des causes</CardTitle>
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
              name="equipmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Équipement</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un équipement" />
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
              name="problemStatement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Énoncé du problème</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Décrivez le problème observé, sans en présumer la cause." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Création…" : "Créer et continuer"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
