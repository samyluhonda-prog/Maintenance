import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export default async function ProfileSettingsPage({ params }: PageProps<"/o/[orgSlug]/settings/profile">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", ctx.userId).single();

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Profil</h1>
      <div className="grid gap-6">
        <ProfileForm profile={profile!} />
        <PasswordForm />
      </div>
    </div>
  );
}
