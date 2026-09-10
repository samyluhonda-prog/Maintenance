import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  under_review: "En évaluation",
  approved: "Approuvée",
  rejected: "Refusée",
  converted: "Convertie",
};
const STATUS_VARIANT: Record<string, "secondary" | "info" | "success" | "destructive" | "outline"> = {
  draft: "secondary",
  submitted: "info",
  under_review: "info",
  approved: "success",
  rejected: "destructive",
  converted: "outline",
};
const URGENCY_LABELS: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique" };

export default async function RequestsPage({ params, searchParams }: PageProps<"/o/[orgSlug]/requests">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  let query = supabase
    .from("requests")
    .select("id, number, title, urgency, status, is_equipment_down, created_at, equipment(name)")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  const REQUEST_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "converted"] as const;
  if (status === "open") query = query.in("status", ["submitted", "under_review"]);
  else if (status !== "all" && (REQUEST_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status as (typeof REQUEST_STATUSES)[number]);
  }

  const { data: requests } = await query;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Demandes de maintenance</h1>
          <p className="text-muted-foreground">Portail de signalement pour toute l’équipe.</p>
        </div>
        <Button asChild>
          <Link href={`/o/${orgSlug}/requests/new`}>
            <Plus /> Nouvelle demande
          </Link>
        </Button>
      </div>

      <Tabs value={status} className="mb-4">
        <TabsList>
          <TabsTrigger value="open" asChild>
            <Link href={`/o/${orgSlug}/requests?status=open`}>En attente</Link>
          </TabsTrigger>
          <TabsTrigger value="approved" asChild>
            <Link href={`/o/${orgSlug}/requests?status=approved`}>Approuvées</Link>
          </TabsTrigger>
          <TabsTrigger value="rejected" asChild>
            <Link href={`/o/${orgSlug}/requests?status=rejected`}>Refusées</Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={`/o/${orgSlug}/requests?status=all`}>Toutes</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Équipement</TableHead>
              <TableHead>Urgence</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.number}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/o/${orgSlug}/requests/${r.id}`} className="hover:underline">
                    {r.title}
                  </Link>
                  {r.is_equipment_down && (
                    <Badge variant="destructive" className="ml-2">
                      Arrêt
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.equipment?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{URGENCY_LABELS[r.urgency] ?? r.urgency}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {(requests ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucune demande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
