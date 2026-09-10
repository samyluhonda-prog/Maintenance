"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recordPartTransactionAction } from "@/lib/actions/parts";
import { PART_TRANSACTION_TYPES } from "@/lib/validation/parts";
import { usePermission } from "@/lib/org-context";
import type { Tables } from "@/types/supabase-helpers";

const TYPE_LABELS: Record<(typeof PART_TRANSACTION_TYPES)[number], string> = {
  receipt: "Réception",
  usage: "Utilisation",
  reservation: "Réservation",
  return: "Retour",
  transfer: "Transfert",
  adjustment: "Ajustement",
  cycle_count: "Inventaire cyclique",
  scrap: "Rebut",
};

const INCREASING_TYPES = new Set(["receipt", "return"]);
const DECREASING_TYPES = new Set(["usage", "scrap"]);

function quantitySign(type: string) {
  if (INCREASING_TYPES.has(type)) return "+";
  if (DECREASING_TYPES.has(type)) return "-";
  return "";
}

type TransactionRow = Tables<"part_transactions"> & { profiles: { full_name: string } | null };

export function TransactionsPanel({
  orgSlug,
  orgId,
  partId,
  transactions,
}: {
  orgSlug: string;
  orgId: string;
  partId: string;
  transactions: TransactionRow[];
}) {
  const [type, setType] = useState<(typeof PART_TRANSACTION_TYPES)[number]>("receipt");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const canRecord = usePermission("parts.edit");
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await recordPartTransactionAction(orgSlug, orgId, partId, { type, quantity, note });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaction enregistrée.");
      setQuantity("1");
      setNote("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {canRecord && (
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PART_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantité</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                className="w-28"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Note (optionnel)</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails…" />
            </div>
            <Button type="button" onClick={submit} disabled={pending || !quantity}>
              <Plus /> Enregistrer
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-CA")}</TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABELS[tx.type]}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {quantitySign(tx.type)}
                  {tx.quantity}
                </TableCell>
                <TableCell className="text-muted-foreground">{tx.note ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{tx.profiles?.full_name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucune transaction pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
