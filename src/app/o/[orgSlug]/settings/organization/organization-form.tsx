"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationSettingsAction } from "@/lib/actions/settings";
import { organizationSettingsSchema, type OrganizationSettingsInput } from "@/lib/validation/users";
import type { Tables } from "@/types/supabase-helpers";

export function OrganizationForm({ orgSlug, org }: { orgSlug: string; org: Tables<"organizations"> }) {
  const form = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: org.name,
      localeDefault: org.locale_default as "fr" | "en",
      timezone: org.timezone,
    },
  });

  async function onSubmit(values: OrganizationSettingsInput) {
    const result = await updateOrganizationSettingsAction(orgSlug, org.id, values);
    if (result.error) toast.error(result.error);
    else toast.success("Organisation mise à jour.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="localeDefault"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Langue par défaut</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuseau horaire</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : America/Toronto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-fit">
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
