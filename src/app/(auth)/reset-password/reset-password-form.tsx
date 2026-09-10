"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, type ActionResult } from "@/lib/auth/actions";

const initialState: ActionResult & { sent?: boolean } = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await requestPasswordResetAction(prev, fd);
    return { ...result, sent: !result.error };
  }, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>Nous vous enverrons un lien de réinitialisation.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.sent ? (
          <p className="rounded-md bg-success/10 p-3 text-sm text-success">
            Si ce courriel correspond à un compte, un lien de réinitialisation a été envoyé.
          </p>
        ) : (
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Courriel</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
