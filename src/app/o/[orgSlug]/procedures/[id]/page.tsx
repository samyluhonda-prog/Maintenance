import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { ProcedureBuilder } from "./procedure-builder";

export default async function ProcedureBuilderPage({ params }: PageProps<"/o/[orgSlug]/procedures/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: template }, { data: fields }] = await Promise.all([
    supabase.from("procedure_templates").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("procedure_fields").select("*").eq("template_id", id).order("order_index"),
  ]);

  if (!template) notFound();

  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("procedures.edit");
  const canDelete = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("procedures.delete");
  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("procedures.create");

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <ProcedureBuilder
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        template={template}
        fields={fields ?? []}
        canEdit={canEdit}
        canDelete={canDelete}
        canDuplicate={canCreate}
      />
    </div>
  );
}
