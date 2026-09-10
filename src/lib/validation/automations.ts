import { z } from "zod";

export const TRIGGER_EVENTS = [
  "request.created",
  "request.critical_created",
  "equipment.status_changed",
  "equipment.repeat_failure",
  "work_order.created",
  "work_order.completed",
  "work_order.overdue",
  "work_order.unassigned_timeout",
  "procedure.failed",
  "meter.threshold_reached",
  "part.below_min",
] as const;

export const TRIGGER_EVENT_LABELS: Record<(typeof TRIGGER_EVENTS)[number], string> = {
  "request.created": "Demande créée",
  "request.critical_created": "Demande critique créée",
  "equipment.status_changed": "Statut d’un équipement modifié",
  "equipment.repeat_failure": "Panne répétée d’un équipement",
  "work_order.created": "Bon de travail créé",
  "work_order.completed": "Bon de travail complété",
  "work_order.overdue": "Bon de travail en retard",
  "work_order.unassigned_timeout": "Bon de travail non assigné (délai dépassé)",
  "procedure.failed": "Procédure échouée",
  "meter.threshold_reached": "Seuil de compteur atteint",
  "part.below_min": "Pièce sous le seuil minimum",
};

export const CONDITION_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "contains"] as const;
export const CONDITION_OPERATOR_LABELS: Record<(typeof CONDITION_OPERATORS)[number], string> = {
  eq: "égal à",
  neq: "différent de",
  gt: "supérieur à",
  gte: "supérieur ou égal à",
  lt: "inférieur à",
  lte: "inférieur ou égal à",
  contains: "contient",
};

/** Common action types with dedicated UI; any other string is still accepted (executed as "non implémenté"). */
export const AUTOMATION_ACTION_TYPES = ["notify", "create_purchase_request", "other"] as const;
export const AUTOMATION_ACTION_TYPE_LABELS: Record<(typeof AUTOMATION_ACTION_TYPES)[number], string> = {
  notify: "Envoyer une notification",
  create_purchase_request: "Créer une demande d’achat",
  other: "Autre (avancé)",
};

const automationActionSchema = z
  .object({
    type: z.string().trim().min(1, "Le type est requis.").max(100),
    paramsJson: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.paramsJson) {
      try {
        JSON.parse(val.paramsJson);
      } catch {
        ctx.addIssue({ code: "custom", message: "Le JSON des paramètres n’est pas valide.", path: ["paramsJson"] });
      }
    }
  });

/**
 * Kept intentionally minimal: one optional {field, operator, value} condition
 * rather than a full rule-builder UI. Matches the simple shape `conditions
 * jsonb` is expected to hold — e.g. `{"field":"urgency","operator":"eq","value":"critical"}`.
 * Leave `conditionField` empty for "always run" (no condition).
 */
export const automationRuleSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.boolean(),
  triggerEvent: z.enum(TRIGGER_EVENTS),
  conditionField: z.string().trim().max(100).optional().or(z.literal("")),
  conditionOperator: z.enum(CONDITION_OPERATORS).optional(),
  conditionValue: z.string().trim().max(500).optional().or(z.literal("")),
  actions: z.array(automationActionSchema).min(1, "Ajoutez au moins une action."),
});
/** What the form collects — use for `useForm<AutomationRuleFormValues>`. */
export type AutomationRuleFormValues = z.input<typeof automationRuleSchema>;
/** What the server action receives after zod validation. */
export type AutomationRuleInput = z.output<typeof automationRuleSchema>;
