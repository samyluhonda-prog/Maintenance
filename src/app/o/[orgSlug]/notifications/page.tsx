import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage({ params }: PageProps<"/o/[orgSlug]/notifications">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("org_id", ctx.org.id)
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Notifications</h1>
      <NotificationsList orgSlug={orgSlug} orgId={ctx.org.id} notifications={notifications ?? []} />
    </div>
  );
}
