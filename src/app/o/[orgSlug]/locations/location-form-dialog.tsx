"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertLocationAction } from "@/lib/actions/locations";
import { locationSchema, LOCATION_TYPES, type LocationInput } from "@/lib/validation/locations";
import type { Tables } from "@/types/supabase-helpers";

const TYPE_LABELS: Record<(typeof LOCATION_TYPES)[number], string> = {
  site: "Installation",
  building: "Bâtiment",
  zone: "Zone",
  production_line: "Ligne de production",
  system: "Système",
  other: "Autre",
};

export function LocationFormDialog({
  orgSlug,
  orgId,
  locations,
  location,
  defaultParentId,
  trigger,
}: {
  orgSlug: string;
  orgId: string;
  locations: Tables<"locations">[];
  location?: Tables<"locations">;
  defaultParentId?: string | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      id: location?.id,
      parentId: location?.parent_id ?? defaultParentId ?? null,
      type: (location?.type as LocationInput["type"]) ?? "site",
      name: location?.name ?? "",
      code: location?.code ?? "",
      address: location?.address ?? "",
      notes: location?.notes ?? "",
    },
  });

  async function onSubmit(values: LocationInput) {
    const result = await upsertLocationAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(location ? "Emplacement mis à jour." : "Emplacement créé.");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Modifier l’emplacement" : "Nouvel emplacement"}</DialogTitle>
          <DialogDescription>
            Sites, bâtiments, zones, lignes de production ou systèmes — organisés en hiérarchie.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                      {LOCATION_TYPES.map((t) => (
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emplacement parent</FormLabel>
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
                      <SelectItem value="none">Aucun (racine)</SelectItem>
                      {locations
                        .filter((l) => l.id !== location?.id)
                        .map((l) => (
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : BAT-A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
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
