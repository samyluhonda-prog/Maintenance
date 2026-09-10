"use client";

import { useMemo, useState } from "react";
import { ChevronRight, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteLocationAction } from "@/lib/actions/locations";
import { usePermission } from "@/lib/org-context";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase-helpers";

import { LocationFormDialog } from "./location-form-dialog";

const TYPE_LABELS: Record<string, string> = {
  site: "Installation",
  building: "Bâtiment",
  zone: "Zone",
  production_line: "Ligne de production",
  system: "Système",
  other: "Autre",
};

type LocationRow = Tables<"locations">;

function buildTree(locations: LocationRow[]) {
  const byParent = new Map<string | null, LocationRow[]>();
  for (const loc of locations) {
    const key = loc.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(loc);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return byParent;
}

export function LocationTree({
  orgSlug,
  orgId,
  locations,
}: {
  orgSlug: string;
  orgId: string;
  locations: LocationRow[];
}) {
  const byParent = useMemo(() => buildTree(locations), [locations]);
  const roots = byParent.get(null) ?? [];
  const canEdit = usePermission("locations.edit");
  const canCreate = usePermission("locations.create");
  const canDelete = usePermission("locations.delete");

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <MapPin className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="mb-4 text-muted-foreground">Aucun emplacement pour le moment.</p>
        {canCreate && (
          <LocationFormDialog
            orgSlug={orgSlug}
            orgId={orgId}
            locations={locations}
            trigger={
              <Button>
                <Plus /> Créer le premier emplacement
              </Button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      {roots.map((loc) => (
        <TreeNode
          key={loc.id}
          node={loc}
          byParent={byParent}
          depth={0}
          orgSlug={orgSlug}
          orgId={orgId}
          locations={locations}
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  byParent,
  depth,
  orgSlug,
  orgId,
  locations,
  canEdit,
  canCreate,
  canDelete,
}: {
  node: LocationRow;
  byParent: Map<string | null, LocationRow[]>;
  depth: number;
  orgSlug: string;
  orgId: string;
  locations: LocationRow[];
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = byParent.get(node.id) ?? [];

  async function handleDelete() {
    const result = await deleteLocationAction(orgSlug, node.id);
    if (result.error) toast.error(result.error);
    else toast.success("Emplacement supprimé.");
  }

  return (
    <div>
      <div
        className="group flex items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-secondary/50"
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn("shrink-0 text-muted-foreground", children.length === 0 && "invisible")}
        >
          <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
        </button>
        <span className="flex-1 truncate text-sm font-medium">{node.name}</span>
        <Badge variant="outline">{TYPE_LABELS[node.type] ?? node.type}</Badge>
        {node.code && <span className="text-xs text-muted-foreground">{node.code}</span>}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          {canCreate && (
            <LocationFormDialog
              orgSlug={orgSlug}
              orgId={orgId}
              locations={locations}
              defaultParentId={node.id}
              trigger={
                <Button variant="ghost" size="icon" className="size-7" title="Ajouter un sous-emplacement">
                  <Plus className="size-3.5" />
                </Button>
              }
            />
          )}
          {canEdit && (
            <LocationFormDialog
              orgSlug={orgSlug}
              orgId={orgId}
              locations={locations}
              location={node}
              trigger={
                <Button variant="ghost" size="icon" className="size-7" title="Modifier">
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Supprimer">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer « {node.name} » ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera aussi tous les sous-emplacements de « {node.name} ». Les
                    équipements qui y sont rattachés seront désassociés, pas supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            byParent={byParent}
            depth={depth + 1}
            orgSlug={orgSlug}
            orgId={orgId}
            locations={locations}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        ))}
    </div>
  );
}
