import { redirect } from "next/navigation";

export default async function SettingsIndexPage({ params }: PageProps<"/o/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  redirect(`/o/${orgSlug}/settings/profile`);
}
