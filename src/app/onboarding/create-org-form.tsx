"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationAction, type ActionResult } from "@/lib/auth/actions";

const initialState: ActionResult = {};

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer votre organisation</CardTitle>
        <CardDescription>
          Une organisation regroupe vos installations, vos équipements et votre équipe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom de l’organisation</Label>
            <Input id="name" name="name" placeholder="Ex. : Groupe Valorisation Nord" required autoFocus />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Création…" : "Créer et continuer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
