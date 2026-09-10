import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

export default async function ProceduresListPage({ params }: PageProps<"/o/[orgSlug]/procedures">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: templates }, { data: fields }] = await Promise.all([
    supabase
      .from("procedure_templates")
      .select("id, name, category, version, is_active")
      .eq("org_id", ctx.org.id)
      .order("name"),
    supabase.from("procedure_fields").select("template_id").eq("org_id", ctx.org.id),
  ]);

  const fieldCountByTemplate = new Map<string, number>();
  for (const f of fields ?? []) fieldCountByTemplate.set(f.template_id, (fieldCountByTemplate.get(f.template_id) ?? 0) + 1);

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("procedures.create");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Procédures</h1>
          <p className="text-muted-foreground">Modèles d’inspection et de vérification réutilisables.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/procedures/new`}>
              <Plus /> Nouvelle procédure
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Champs</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(templates ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link href={`/o/${orgSlug}/procedures/${t.id}`} className="hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.category ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">v{t.version}</TableCell>
                <TableCell className="text-muted-foreground">{fieldCountByTemplate.get(t.id) ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "success" : "secondary"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(templates ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-3 size-8" />
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
