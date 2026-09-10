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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { convertRequestToWorkOrderAction, reviewRequestAction, submitDraftRequestAction } from "@/lib/actions/requests";

export function RequestActions({
  orgSlug,
  orgId,
  requestId,
  status,
  canReview,
  isOwner,
}: {
  orgSlug: string;
  orgId: string;
  requestId: string;
  status: string;
  canReview: boolean;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const router = useRouter();

  function review(decision: "approved" | "rejected") {
    startTransition(async () => {
      const result = await reviewRequestAction(orgSlug, requestId, { decision, note });
      if (result.error) toast.error(result.error);
      else {
        toast.success(decision === "approved" ? "Demande approuvée." : "Demande refusée.");
        router.refresh();
      }
    });
  }

  function convert() {
    startTransition(async () => {
      const result = await convertRequestToWorkOrderAction(orgSlug, orgId, requestId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Bon de travail créé.");
        router.push(`/o/${orgSlug}/work-orders/${result.data!.workOrderId}`);
      }
    });
  }

  function submitDraft() {
    startTransition(async () => {
      const result = await submitDraftRequestAction(orgSlug, requestId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Demande soumise.");
        router.refresh();
      }
    });
  }

  if (status === "draft" && isOwner) {
    return (
      <Button onClick={submitDraft} disabled={pending}>
        Soumettre la demande
      </Button>
    );
  }

  if (status === "approved") {
    return (
      <Button onClick={convert} disabled={pending}>
        Convertir en bon de travail
      </Button>
    );
  }

  if (status !== "submitted" || !canReview) return null;

  return (
    <div className="flex gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Refuser</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Motif du refus (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={() => review("rejected")} disabled={pending}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button onClick={() => review("approved")} disabled={pending}>
        Approuver
      </Button>
    </div>
  );
}
