import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { RequestActions } from "./request-actions";
import { RequestAttachments } from "./request-attachments";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  under_review: "En évaluation",
  approved: "Approuvée",
  rejected: "Refusée",
  converted: "Convertie",
};

export default async function RequestDetailPage({ params }: PageProps<"/o/[orgSlug]/requests/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: request }, { data: attachments }] = await Promise.all([
    supabase
      .from("requests")
      .select("*, equipment(id, name), locations(name), converted_work_order_id")
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    supabase.from("request_attachments").select("*").eq("request_id", id).order("created_at"),
  ]);

  if (!request) notFound();

  const canReview =
    ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("requests.approve");
  const isOwner = request.requested_by === ctx.userId;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
            <Badge>{STATUS_LABELS[request.status] ?? request.status}</Badge>
          </div>
          <p className="text-muted-foreground">{request.number}</p>
        </div>
        <RequestActions
          orgSlug={orgSlug}
          orgId={ctx.org.id}
          requestId={request.id}
          status={request.status}
          canReview={canReview}
          isOwner={isOwner}
        />
      </div>

      {request.converted_work_order_id && (
        <Card className="mb-6 border-success/40 bg-success/5">
          <CardContent className="py-4 text-sm">
            Convertie en bon de travail —{" "}
            <Link href={`/o/${orgSlug}/work-orders/${request.converted_work_order_id}`} className="font-medium underline">
              voir le bon de travail
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p className="whitespace-pre-wrap">{request.description || "Aucune description."}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4">
              <div>
                <div className="text-xs uppercase">Équipement</div>
                <div className="text-foreground">{request.equipment?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase">Emplacement</div>
                <div className="text-foreground">{request.locations?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase">Urgence</div>
                <div className="text-foreground">{request.urgency}</div>
              </div>
              <div>
                <div className="text-xs uppercase">Équipement arrêté</div>
                <div className="text-foreground">{request.is_equipment_down ? "Oui" : "Non"}</div>
              </div>
            </div>
            {request.review_note && (
              <p className="mt-2 rounded-md bg-secondary p-2 text-sm">
                <span className="font-medium">Note de révision : </span>
                {request.review_note}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pièces jointes</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestAttachments
              orgSlug={orgSlug}
              orgId={ctx.org.id}
              requestId={request.id}
              attachments={attachments ?? []}
              canUpload={isOwner}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
