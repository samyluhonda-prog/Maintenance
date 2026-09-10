import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves a printed QR/barcode label to the record it identifies. `qr_code`
 * is unique per-table (not per-org), and RLS on each table already limits
 * results to orgs the signed-in user belongs to — so a match here is
 * guaranteed to be something they're allowed to see.
 */
export default async function ScanResolverPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const [{ data: equipment }, { data: location }, { data: part }] = await Promise.all([
    supabase.from("equipment").select("id, organizations(slug)").eq("qr_code", code).maybeSingle(),
    supabase.from("locations").select("id, organizations(slug)").eq("qr_code", code).maybeSingle(),
    supabase.from("parts").select("id, organizations(slug)").eq("qr_code", code).maybeSingle(),
  ]);

  if (equipment?.organizations) redirect(`/o/${equipment.organizations.slug}/equipment/${equipment.id}`);
  if (location?.organizations) redirect(`/o/${location.organizations.slug}/locations?highlight=${location.id}`);
  if (part?.organizations) redirect(`/o/${part.organizations.slug}/parts/${part.id}`);

  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Code introuvable</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Le code « {code} » ne correspond à aucun équipement, emplacement ou pièce auquel vous avez accès.
          </p>
          <Button asChild>
            <Link href="/onboarding">Retour</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
