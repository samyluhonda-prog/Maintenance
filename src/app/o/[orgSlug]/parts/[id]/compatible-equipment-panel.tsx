"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { linkEquipmentPartAction, unlinkEquipmentPartAction } from "@/lib/actions/parts";
import { usePermission } from "@/lib/org-context";

export function CompatibleEquipmentPanel({
  orgSlug,
  orgId,
  partId,
  linkedEquipment,
  availableEquipment,
}: {
  orgSlug: string;
  orgId: string;
  partId: string;
  linkedEquipment: { id: string; name: string }[];
  availableEquipment: { id: string; name: string }[];
}) {
  const [equipmentId, setEquipmentId] = useState("");
  const [pending, startTransition] = useTransition();
  const canEdit = usePermission("parts.edit");
  const router = useRouter();

  function addLink() {
    if (!equipmentId) return;
    startTransition(async () => {
      const result = await linkEquipmentPartAction(orgSlug, orgId, partId, equipmentId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEquipmentId("");
      router.refresh();
    });
  }

  function removeLink(id: string) {
    startTransition(async () => {
      const result = await unlinkEquipmentPartAction(orgSlug, partId, id);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pièces compatibles avec</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {linkedEquipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun équipement associé.</p>
        ) : (
          <ul className="grid gap-1">
            {linkedEquipment.map((eq) => (
              <li key={eq.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <Link href={`/o/${orgSlug}/equipment/${eq.id}`} className="font-medium hover:underline">
                  {eq.name}
                </Link>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => removeLink(eq.id)}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="flex gap-2">
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Associer un équipement…" />
              </SelectTrigger>
              <SelectContent>
                {availableEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={addLink} disabled={pending || !equipmentId}>
              <Plus />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
