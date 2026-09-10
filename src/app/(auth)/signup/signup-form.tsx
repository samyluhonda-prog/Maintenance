"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type ActionResult } from "@/lib/auth/actions";

const initialState: ActionResult = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
        <CardDescription>Quelques secondes suffisent pour commencer.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Courriel</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
            <p className="text-xs text-muted-foreground">
              10 caractères minimum, avec majuscule, minuscule et chiffre.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Création…" : "Créer un compte"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
