"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { LogoMark } from "@/components/auth/logo-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitationAction } from "@/lib/actions/users";

export function AcceptInviteCard({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function accept() {
    setPending(true);
    const result = await acceptInvitationAction(token);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Bienvenue dans l’organisation !");
    router.push(`/o/${result.data!.orgSlug}/dashboard`);
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <LogoMark className="mb-2 size-8" />
        <CardTitle>Invitation à rejoindre une organisation</CardTitle>
        <CardDescription>Confirmez pour accepter et accéder à l’espace de maintenance.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={accept} disabled={pending}>
          {pending ? "Traitement…" : "Accepter l’invitation"}
        </Button>
      </CardContent>
    </Card>
  );
}
