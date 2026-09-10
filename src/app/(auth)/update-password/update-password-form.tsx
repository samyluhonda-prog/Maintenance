"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction, type ActionResult } from "@/lib/auth/actions";

const initialState: ActionResult = {};

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un nouveau mot de passe pour votre compte.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
