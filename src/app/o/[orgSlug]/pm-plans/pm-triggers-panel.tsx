"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { deletePmTriggerAction, togglePmTriggerActiveAction } from "@/lib/actions/pm-plans";
import { summarizePmTrigger } from "@/lib/pm/schedule";
import type { Tables } from "@/types/supabase-helpers";

import { TriggerFormDialog } from "./trigger-form-dialog";

type TriggerWithMeter = Tables<"pm_triggers"> & { meters: { name: string; unit: string } | null };

export function PmTriggersPanel({
  orgSlug,
  orgId,
  pmPlanId,
  triggers,
  meters,
  canEdit,
}: {
  orgSlug: string;
  orgId: string;
  pmPlanId: string;
  triggers: TriggerWithMeter[];
  meters: Tables<"meters">[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(triggerId: string, isActive: boolean) {
    startTransition(async () => {
      const result = await togglePmTriggerActiveAction(orgSlug, pmPlanId, triggerId, isActive);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete(triggerId: string) {
    startTransition(async () => {
      const result = await deletePmTriggerAction(orgSlug, pmPlanId, triggerId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Déclencheur supprimé.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Déclencheurs</CardTitle>
        {canEdit && (
          <TriggerFormDialog
            orgSlug={orgSlug}
            orgId={orgId}
            pmPlanId={pmPlanId}
            meters={meters}
            triggerButton={
              <Button size="sm">
                <Plus /> Ajouter un déclencheur
              </Button>
            }
          />
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {triggers.length === 0 && <p className="text-sm text-muted-foreground">Aucun déclencheur configuré.</p>}
        {triggers.map((trigger) => (
          <div key={trigger.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{summarizePmTrigger(trigger, trigger.meters?.unit)}</span>
                <Badge variant="outline">{trigger.kind === "calendar" ? "Calendrier" : trigger.kind === "meter" ? "Compteur" : "Condition"}</Badge>
              </div>
              {trigger.kind === "calendar" && trigger.next_due_at && (
                <p className="text-xs text-muted-foreground">
                  Prochaine échéance : {new Date(trigger.next_due_at).toLocaleDateString("fr-CA")}
                  {trigger.tolerance_days > 0 ? ` (± ${trigger.tolerance_days} j)` : ""}
                </p>
              )}
              {trigger.kind === "meter" && trigger.last_generated_meter_value != null && (
                <p className="text-xs text-muted-foreground">
                  Dernière génération à {trigger.last_generated_meter_value} {trigger.meters?.unit}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={trigger.is_active}
                disabled={!canEdit || pending}
                onCheckedChange={(checked) => handleToggle(trigger.id, checked)}
              />
              {canEdit && (
                <>
                  <TriggerFormDialog
                    orgSlug={orgSlug}
                    orgId={orgId}
                    pmPlanId={pmPlanId}
                    meters={meters}
                    trigger={trigger}
                    triggerButton={
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={pending}>
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce déclencheur ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Les bons de travail déjà générés ne seront pas supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(trigger.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
