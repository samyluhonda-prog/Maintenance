import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PartForm } from "../part-form";

export default async function NewPartPage({ params }: PageProps<"/o/[orgSlug]/parts/new">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: locations }, { data: suppliers }] = await Promise.all([
    supabase.from("locations").select("*").eq("org_id", ctx.org.id).order("name"),
    supabase.from("suppliers").select("*").eq("org_id", ctx.org.id).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouvelle pièce</h1>
      <PartForm orgSlug={orgSlug} orgId={ctx.org.id} locations={locations ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
