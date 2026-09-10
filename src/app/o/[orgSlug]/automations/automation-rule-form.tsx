"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { upsertAutomationRuleAction } from "@/lib/actions/automations";
import {
  AUTOMATION_ACTION_TYPE_LABELS,
  AUTOMATION_ACTION_TYPES,
  automationRuleSchema,
  CONDITION_OPERATOR_LABELS,
  CONDITION_OPERATORS,
  TRIGGER_EVENT_LABELS,
  TRIGGER_EVENTS,
  type AutomationRuleFormValues,
} from "@/lib/validation/automations";
import type { Tables } from "@/types/supabase-helpers";

const KNOWN_TYPES = new Set<string>(["notify", "create_purchase_request"]);

const PARAMS_PLACEHOLDER: Record<string, string> = {
  notify: '{"role": "maintenance_manager", "message": "{title} nécessite attention"}',
  create_purchase_request: "{}",
  other: '{"anyKey": "anyValue"}',
};

function ActionRow({
  form,
  index,
  onRemove,
}: {
  form: ReturnType<typeof useForm<AutomationRuleFormValues>>;
  index: number;
  onRemove: () => void;
}) {
  const type = form.watch(`actions.${index}.type`);
  const presetValue = KNOWN_TYPES.has(type) ? type : "other";

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <FormField
          control={form.control}
          name={`actions.${index}.type`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Type d’action</FormLabel>
              <Select
                value={presetValue}
                onValueChange={(v) => field.onChange(v === "other" ? (KNOWN_TYPES.has(field.value) ? "" : field.value) : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AUTOMATION_ACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {AUTOMATION_ACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {presetValue === "other" && (
        <FormField
          control={form.control}
          name={`actions.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type personnalisé</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex. : send_sms" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name={`actions.${index}.paramsJson`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Paramètres (JSON, facultatif)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} className="font-mono text-xs" placeholder={PARAMS_PLACEHOLDER[presetValue]} />
            </FormControl>
            {presetValue === "notify" && (
              <p className="text-xs text-muted-foreground">
                Clés reconnues : <code>role</code> (ou <code>user_id</code>) et <code>message</code>. Le message
                accepte des espaces réservés comme <code>{"{title}"}</code>, <code>{"{equipment}"}</code>,{" "}
                <code>{"{number}"}</code> — remplacés par les champs du même nom fournis à l’événement.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function AutomationRuleForm({
  orgSlug,
  orgId,
  rule,
}: {
  orgSlug: string;
  orgId: string;
  rule?: Tables<"automation_rules">;
}) {
  const router = useRouter();

  const conditions = (rule?.conditions ?? {}) as { field?: string; operator?: string; value?: string };
  const actions = Array.isArray(rule?.actions) ? (rule!.actions as unknown as { type: string; params?: Record<string, unknown> }[]) : [];

  const form = useForm<AutomationRuleFormValues>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: {
      id: rule?.id,
      name: rule?.name ?? "",
      description: rule?.description ?? "",
      isActive: rule?.is_active ?? true,
      triggerEvent: (rule?.trigger_event as AutomationRuleFormValues["triggerEvent"]) ?? "request.critical_created",
      conditionField: conditions.field ?? "",
      conditionOperator: (conditions.operator as AutomationRuleFormValues["conditionOperator"]) ?? "eq",
      conditionValue: conditions.value ?? "",
      actions:
        actions.length > 0
          ? actions.map((a) => ({ type: a.type, paramsJson: a.params && Object.keys(a.params).length > 0 ? JSON.stringify(a.params, null, 2) : "" }))
          : [{ type: "notify", paramsJson: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "actions" });

  async function onSubmit(values: AutomationRuleFormValues) {
    const result = await upsertAutomationRuleAction(orgSlug, orgId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(rule ? "Règle mise à jour." : "Règle créée.");
    router.push(`/o/${orgSlug}/automations`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Règle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Ex. : Alerter le gestionnaire des demandes critiques" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description (facultatif)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="triggerEvent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Événement déclencheur</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRIGGER_EVENTS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {TRIGGER_EVENT_LABELS[e]}
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <FormLabel>Règle active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condition (facultative)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <p className="text-sm text-muted-foreground sm:col-span-3">
              Volontairement minimal : une seule condition {"{champ, opérateur, valeur}"} comparée aux données de
              l’événement. Laissez le champ vide pour que la règle s’exécute toujours.
            </p>
            <FormField
              control={form.control}
              name="conditionField"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Champ</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : urgency" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conditionOperator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opérateur</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_OPERATORS.map((op) => (
                        <SelectItem key={op} value={op}>
                          {CONDITION_OPERATOR_LABELS[op]}
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
              name="conditionValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valeur</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex. : critical" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Actions</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append({ type: "notify", paramsJson: "" })}>
              <Plus /> Ajouter une action
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {fields.map((field, index) => (
              <ActionRow key={field.id} form={form} index={index} onRemove={() => remove(index)} />
            ))}
            {form.formState.errors.actions?.root?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.actions.root.message}</p>
            )}
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
