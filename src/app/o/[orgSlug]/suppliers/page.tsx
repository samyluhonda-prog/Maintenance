import Link from "next/link";
import { Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

export default async function SuppliersListPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/suppliers">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  let query = supabase
    .from("suppliers")
    .select("id, name, contact_name, email, phone, rating")
    .eq("org_id", ctx.org.id)
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: suppliers } = await query;
  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("suppliers.create");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">Registre des fournisseurs et sous-traitants.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/suppliers/new`}>
              <Plus /> Nouveau fournisseur
            </Link>
          </Button>
        )}
      </div>

      <form className="mb-4 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un fournisseur…"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
        />
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Courriel</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Évaluation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(suppliers ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link href={`/o/${orgSlug}/suppliers/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.contact_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                <TableCell>
                  {s.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-warning" /> {s.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(suppliers ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun fournisseur trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
