"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteAutomationRuleAction, toggleAutomationRuleActiveAction } from "@/lib/actions/automations";

export function AutomationRuleRowActions({
  orgSlug,
  ruleId,
  ruleName,
  isActive,
  canEdit,
}: {
  orgSlug: string;
  ruleId: string;
  ruleName: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleAutomationRuleActiveAction(orgSlug, ruleId, checked);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAutomationRuleAction(orgSlug, ruleId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Règle supprimée.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={isActive} disabled={!canEdit || pending} onCheckedChange={handleToggle} />
      {canEdit && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={pending}>
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer « {ruleName} » ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible. Le journal d’exécution existant sera conservé.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
