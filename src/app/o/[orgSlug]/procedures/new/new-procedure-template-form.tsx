"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProcedureTemplateAction } from "@/lib/actions/procedures";
import { procedureTemplateSchema, type ProcedureTemplateFormValues } from "@/lib/validation/procedures";

export function NewProcedureTemplateForm({ orgSlug, orgId }: { orgSlug: string; orgId: string }) {
  const router = useRouter();

  const form = useForm<ProcedureTemplateFormValues>({
    resolver: zodResolver(procedureTemplateSchema),
    defaultValues: { name: "", description: "", category: "" },
  });

  async function onSubmit(values: ProcedureTemplateFormValues) {
    const result = await createProcedureTemplateAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Procédure créée.");
    router.push(`/o/${orgSlug}/procedures/${result.data!.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex. : Inspection mensuelle — convoyeur" />
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
                    <Input {...field} placeholder="Ex. : Sécurité, Préventif, Qualité…" />
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
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Création…" : "Créer et continuer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
