"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { cancelPurchaseOrderAction, updatePurchaseOrderStatusAction } from "@/lib/actions/purchasing";
import { usePermission } from "@/lib/org-context";
import type { PURCHASE_ORDER_STATUSES } from "@/lib/validation/purchasing";

type Status = (typeof PURCHASE_ORDER_STATUSES)[number];

const NEXT_ACTION: Partial<Record<Status, { label: string; next: Status; permission: "purchasing.edit" | "purchasing.approve" }>> = {
  draft: { label: "Soumettre", next: "requested", permission: "purchasing.edit" },
  requested: { label: "Envoyer pour approbation", next: "pending_approval", permission: "purchasing.edit" },
  pending_approval: { label: "Approuver", next: "approved", permission: "purchasing.approve" },
  approved: { label: "Commander", next: "ordered", permission: "purchasing.edit" },
  received: { label: "Fermer", next: "closed", permission: "purchasing.edit" },
};

const TERMINAL_STATUSES: readonly Status[] = ["closed", "cancelled"];

export function PurchaseOrderActions({ orgSlug, poId, status }: { orgSlug: string; poId: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const canEdit = usePermission("purchasing.edit");
  const canApprove = usePermission("purchasing.approve");
  const router = useRouter();

  const action = NEXT_ACTION[status];
  const canDoAction = action && (action.permission === "purchasing.edit" ? canEdit : canApprove);
  const canCancel = !TERMINAL_STATUSES.includes(status) && (canEdit || (status === "pending_approval" && canApprove));

  function advance(next: Status) {
    startTransition(async () => {
      const result = await updatePurchaseOrderStatusAction(orgSlug, poId, next);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Statut mis à jour.");
        router.refresh();
      }
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelPurchaseOrderAction(orgSlug, poId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Bon de commande annulé.");
        router.refresh();
      }
    });
  }

  if (!canDoAction && !canCancel) return null;

  return (
    <div className="flex gap-2">
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              Annuler la commande
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler ce bon de commande ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Retour</AlertDialogCancel>
              <AlertDialogAction onClick={cancel}>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {canDoAction && action && (
        <Button onClick={() => advance(action.next)} disabled={pending}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
