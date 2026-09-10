"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { receivePurchaseOrderLineAction } from "@/lib/actions/purchasing";
import { usePermission } from "@/lib/org-context";
import type { Tables } from "@/types/supabase-helpers";

type LineRow = Tables<"purchase_order_lines"> & { parts: { name: string } | null };

function ReceiveDialog({
  orgSlug,
  poId,
  line,
}: {
  orgSlug: string;
  poId: string;
  line: LineRow;
}) {
  const remaining = line.quantity - line.quantity_received;
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(remaining));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0 || qty > remaining) {
      toast.error(`La quantité doit être entre 1 et ${remaining}.`);
      return;
    }
    startTransition(async () => {
      const result = await receivePurchaseOrderLineAction(orgSlug, poId, line.id, qty);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Réception enregistrée.");
      setOpen(false);
      router.refresh();
    });
  }

  function handleOpenChange(next: boolean) {
    if (next) setQuantity(String(remaining));
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackageCheck /> Recevoir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recevoir « {line.description} »</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium">Quantité reçue (reste {remaining})</label>
          <Input
            type="number"
            min="1"
            max={remaining}
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            Confirmer la réception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LineItemsTable({ orgSlug, poId, lines }: { orgSlug: string; poId: string; lines: LineRow[] }) {
  const canEditPurchasing = usePermission("purchasing.edit");
  const canEditParts = usePermission("parts.edit");
  const canReceive = canEditPurchasing && canEditParts;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Pièce</TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead className="text-right">Reçu</TableHead>
            <TableHead className="text-right">Coût unitaire</TableHead>
            <TableHead className="text-right">Sous-total</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const remaining = line.quantity - line.quantity_received;
            return (
              <TableRow key={line.id}>
                <TableCell className="font-medium">{line.description}</TableCell>
                <TableCell className="text-muted-foreground">{line.parts?.name ?? "—"}</TableCell>
                <TableCell className="text-right">{line.quantity}</TableCell>
                <TableCell className="text-right">{line.quantity_received}</TableCell>
                <TableCell className="text-right">{line.unit_cost.toFixed(2)} $</TableCell>
                <TableCell className="text-right">{(line.quantity * line.unit_cost).toFixed(2)} $</TableCell>
                <TableCell>
                  {canReceive && remaining > 0 && <ReceiveDialog orgSlug={orgSlug} poId={poId} line={line} />}
                </TableCell>
              </TableRow>
            );
          })}
          {lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Aucune ligne.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
