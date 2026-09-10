"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { closeWorkOrderAction, updateWorkOrderStatusAction } from "@/lib/actions/work-orders";
import { WORK_ORDER_STATUSES } from "@/lib/validation/work-orders";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En attente de pièces / pause",
  completed: "Terminé",
  to_review: "À vérifier",
  closed: "Fermé",
  cancelled: "Annulé",
  skipped: "Sauté",
};

export function StatusBar({
  orgSlug,
  workOrderId,
  status,
  canEdit,
  canClose,
}: {
  orgSlug: string;
  workOrderId: string;
  status: string;
  canEdit: boolean;
  canClose: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [closeOpen, setCloseOpen] = useState(false);
  const [failureCause, setFailureCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const router = useRouter();

  function changeStatus(next: string) {
    if (next === "closed") {
      setCloseOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await updateWorkOrderStatusAction(orgSlug, workOrderId, next as (typeof WORK_ORDER_STATUSES)[number]);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function confirmClose() {
    startTransition(async () => {
      const result = await closeWorkOrderAction(orgSlug, workOrderId, {
        failureCause,
        resolution,
        followUpRequired: followUp,
        followUpNotes,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Bon de travail clôturé.");
        setCloseOpen(false);
        router.refresh();
      }
    });
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={changeStatus} disabled={pending}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WORK_ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s} disabled={s === "closed" && !canClose}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer le bon de travail</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium">Cause de la panne</label>
              <Textarea value={failureCause} onChange={(e) => setFailureCause(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Solution appliquée *</label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={followUp} onCheckedChange={(v) => setFollowUp(!!v)} />
              <label className="text-sm">Travail de suivi requis</label>
            </div>
            {followUp && (
              <Textarea
                placeholder="Détails du suivi requis"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={2}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmClose} disabled={pending || !resolution.trim()}>
              Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
