"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type ActionResult } from "@/lib/auth/actions";

const initialState: ActionResult = {};

export function LoginForm({ confirmEmail, next }: { confirmEmail: boolean; next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Accédez à votre espace de maintenance.</CardDescription>
      </CardHeader>
      <CardContent>
        {confirmEmail && (
          <p className="mb-4 rounded-md bg-info/10 p-3 text-sm text-info">
            Compte créé. Consultez votre courriel pour confirmer votre adresse, puis connectez-vous.
          </p>
        )}
        <form action={formAction} className="grid gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="grid gap-2">
            <Label htmlFor="email">Courriel</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
