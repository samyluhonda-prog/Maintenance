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
import { recordMeterReadingAction } from "@/lib/actions/meters";
import { meterReadingSchema, type MeterReadingFormValues } from "@/lib/validation/meters";

function nowLocalInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReadingForm({
  orgSlug,
  orgId,
  meterId,
  unit,
}: {
  orgSlug: string;
  orgId: string;
  meterId: string;
  unit: string;
}) {
  const router = useRouter();

  const form = useForm<MeterReadingFormValues>({
    resolver: zodResolver(meterReadingSchema),
    defaultValues: { value: undefined, recordedAt: nowLocalInputValue(), note: "" },
  });

  async function onSubmit(values: MeterReadingFormValues) {
    const result = await recordMeterReadingAction(orgSlug, orgId, meterId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Relevé enregistré.");
    form.reset({ value: undefined, recordedAt: nowLocalInputValue(), note: "" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un relevé</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur ({unit})</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} value={(field.value as number | string | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Note (facultatif)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer le relevé"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
