import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Pencil, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { generateQrSvg } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

import { CompatibleEquipmentPanel } from "./compatible-equipment-panel";
import { DeletePartButton } from "./delete-part-button";
import { PhotoCard } from "./photo-card";
import { QrCard } from "./qr-card";
import { TransactionsPanel } from "./transactions-panel";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function PartDetailPage({ params }: PageProps<"/o/[orgSlug]/parts/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: part }, { data: transactions }, { data: links }, { data: equipmentList }] = await Promise.all([
    supabase.from("parts").select("*, locations(name), suppliers(name)").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase
      .from("part_transactions")
      .select("*, profiles(full_name)")
      .eq("part_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("equipment_parts").select("equipment_id, equipment(id, name)").eq("part_id", id),
    supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name"),
  ]);

  if (!part) notFound();

  const qrSvg = part.qr_code ? await generateQrSvg(part.qr_code) : null;

  let photoUrl: string | null = null;
  if (part.photo_path) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(part.photo_path, 3600);
    photoUrl = signed?.signedUrl ?? null;
  }

  const linkedEquipment = (links ?? [])
    .map((l) => l.equipment)
    .filter((eq): eq is { id: string; name: string } => !!eq);
  const linkedIds = new Set(linkedEquipment.map((eq) => eq.id));
  const availableEquipment = (equipmentList ?? []).filter((eq) => !linkedIds.has(eq.id));

  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("parts.edit");
  const canDelete = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("parts.delete");
  const isLow = part.quantity_on_hand <= part.min_threshold;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{part.name}</h1>
            {isLow && (
              <Badge variant="destructive">
                <AlertTriangle /> Stock faible
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {part.number} · {part.locations?.name ?? "Aucun emplacement"}
          </p>
        </div>
        <div className="flex gap-2">
          {isLow && (
            <Button variant="outline" asChild>
              <Link href={`/o/${orgSlug}/purchasing/new?partId=${part.id}`}>
                <ShoppingCart /> Créer une commande
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/o/${orgSlug}/parts/${part.id}/edit`}>
                <Pencil /> Modifier
              </Link>
            </Button>
          )}
          {canDelete && <DeletePartButton orgSlug={orgSlug} partId={part.id} partName={part.name} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Stock</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold">
                  {part.quantity_on_hand} <span className="text-sm font-normal text-muted-foreground">{part.unit}</span>
                </p>
                <p className="text-sm text-muted-foreground">En stock</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{part.quantity_reserved}</p>
                <p className="text-sm text-muted-foreground">Réservé</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{part.quantity_on_order}</p>
                <p className="text-sm text-muted-foreground">En commande</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Description" value={part.description} />
              <InfoRow label="Catégorie" value={part.category} />
              <InfoRow label="Fabricant" value={part.manufacturer} />
              <InfoRow label="Numéro de pièce du fabricant" value={part.manufacturer_part_number} />
              <InfoRow label="Fournisseur principal" value={part.suppliers?.name} />
              <InfoRow label="Coût unitaire" value={`${part.unit_cost.toFixed(2)} $`} />
              <InfoRow label="Seuil minimal" value={part.min_threshold} />
              <InfoRow label="Niveau optimal" value={part.optimal_level} />
              <InfoRow label="Délai de livraison" value={part.lead_time_days != null ? `${part.lead_time_days} jour(s)` : null} />
            </CardContent>
          </Card>

          <TransactionsPanel orgSlug={orgSlug} orgId={ctx.org.id} partId={part.id} transactions={transactions ?? []} />

          <CompatibleEquipmentPanel
            orgSlug={orgSlug}
            orgId={ctx.org.id}
            partId={part.id}
            linkedEquipment={linkedEquipment}
            availableEquipment={availableEquipment}
          />
        </div>

        <div className="grid gap-6">
          <PhotoCard orgSlug={orgSlug} orgId={ctx.org.id} partId={part.id} photoUrl={photoUrl} />
          {qrSvg && <QrCard svg={qrSvg} code={part.qr_code!} name={part.name} number={part.number} />}
        </div>
      </div>
    </div>
  );
}
