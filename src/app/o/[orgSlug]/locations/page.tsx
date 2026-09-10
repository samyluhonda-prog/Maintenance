import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { LocationFormDialog } from "./location-form-dialog";
import { LocationTree } from "./location-tree";

export default async function LocationsPage({ params }: PageProps<"/o/[orgSlug]/locations">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("org_id", ctx.org.id)
    .order("name");

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("locations.create");

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emplacements</h1>
          <p className="text-muted-foreground">
            Installations, bâtiments, zones, lignes de production et systèmes.
          </p>
        </div>
        {canCreate && (
          <LocationFormDialog
            orgSlug={orgSlug}
            orgId={ctx.org.id}
            locations={locations ?? []}
            trigger={
              <Button>
                <Plus /> Nouvel emplacement
              </Button>
            }
          />
        )}
      </div>

      <LocationTree orgSlug={orgSlug} orgId={ctx.org.id} locations={locations ?? []} />
    </div>
  );
}
