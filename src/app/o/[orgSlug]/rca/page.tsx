import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = { open: "Ouverte", in_progress: "En cours", completed: "Terminée" };
const STATUS_VARIANT: Record<string, "secondary" | "info" | "success"> = {
  open: "secondary",
  in_progress: "info",
  completed: "success",
};

export default async function RcaListPage({ params }: PageProps<"/o/[orgSlug]/rca">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("rca_records")
    .select("id, title, status, created_at, equipment(name)")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("rca.create");

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analyse des causes</h1>
          <p className="text-muted-foreground">Méthode des 5 pourquoi, diagramme des causes, actions correctives.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/rca/new`}>
              <Plus /> Nouvelle analyse
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-2">
        {(records ?? []).map((r) => (
          <Link key={r.id} href={`/o/${orgSlug}/rca/${r.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.equipment?.name ?? "Équipement inconnu"}</p>
                </div>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(records ?? []).length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Aucune analyse de cause pour le moment.</p>
        )}
      </div>
    </div>
  );
}
