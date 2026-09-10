import { AcceptInviteCard } from "./accept-invite-card";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center p-6">
      <AcceptInviteCard token={token} />
    </div>
  );
}
