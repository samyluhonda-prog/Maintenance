import { notFound } from "next/navigation";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  "member.invited": "Membre invité",
  "member.role_changed": "Rôle modifié",
  "member.removed": "Membre retiré",
  "organization.updated": "Organisation modifiée",
};

export default async function AuditLogPage({ params }: PageProps<"/o/[orgSlug]/audit-log">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  if (ctx.roleKey !== "owner" && ctx.roleKey !== "admin") notFound();

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("*, profiles(full_name)")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Journal d’audit</h1>
      <p className="mb-6 text-muted-foreground">
        Actions sensibles enregistrées : invitations, changements de rôle, retraits de membres, paramètres de
        l’organisation. Ce journal ne couvre pas encore toutes les mutations de l’application.
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entries ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("fr-CA")}
                </TableCell>
                <TableCell>{e.profiles?.full_name ?? "Système"}</TableCell>
                <TableCell>{ACTION_LABELS[e.action] ?? e.action}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {e.after ? JSON.stringify(e.after) : e.before ? JSON.stringify(e.before) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {(entries ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Aucune entrée pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
