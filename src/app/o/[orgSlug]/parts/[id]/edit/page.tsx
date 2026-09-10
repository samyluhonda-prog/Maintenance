import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PartForm } from "../../part-form";

export default async function EditPartPage({ params }: PageProps<"/o/[orgSlug]/parts/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: part }, { data: locations }, { data: suppliers }] = await Promise.all([
    supabase.from("parts").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("locations").select("*").eq("org_id", ctx.org.id).order("name"),
    supabase.from("suppliers").select("*").eq("org_id", ctx.org.id).order("name"),
  ]);

  if (!part) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier « {part.name} »</h1>
      <PartForm orgSlug={orgSlug} orgId={ctx.org.id} part={part} locations={locations ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
