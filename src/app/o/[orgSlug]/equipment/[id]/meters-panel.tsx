"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gauge, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordMeterReadingAction } from "@/lib/actions/meters";

export type MeterPanelRow = {
  id: string;
  name: string;
  unit: string;
  latest: { value: number; recorded_at: string } | null;
};

function AddReadingDialog({
  orgSlug,
  orgId,
  meter,
}: {
  orgSlug: string;
  orgId: string;
  meter: MeterPanelRow;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setPending(true);
    const result = await recordMeterReadingAction(orgSlug, orgId, meter.id, {
      value,
      recordedAt: new Date().toISOString(),
      note: "",
    });
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Relevé enregistré.");
    setOpen(false);
    setValue("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" title="Ajouter un relevé">
          <Plus className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relevé pour « {meter.name} »</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor={`value-${meter.id}`}>Valeur ({meter.unit})</Label>
            <Input
              id={`value-${meter.id}`}
              type="number"
              step="any"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !value}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MetersPanel({
  orgSlug,
  orgId,
  equipmentId,
  meters,
}: {
  orgSlug: string;
  orgId: string;
  equipmentId: string;
  meters: MeterPanelRow[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compteurs</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/o/${orgSlug}/meters/new?equipmentId=${equipmentId}`}>
            <Plus /> Compteur
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun compteur pour cet équipement.</p>
        ) : (
          <ul className="grid gap-2">
            {meters.map((meter) => (
              <li key={meter.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <Gauge className="size-4 shrink-0 text-muted-foreground" />
                <Link href={`/o/${orgSlug}/meters/${meter.id}`} className="flex-1 truncate font-medium hover:underline">
                  {meter.name}
                </Link>
                <span className="text-muted-foreground">
                  {meter.latest ? `${meter.latest.value} ${meter.unit}` : "Aucun relevé"}
                </span>
                <AddReadingDialog orgSlug={orgSlug} orgId={orgId} meter={meter} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
