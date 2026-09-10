"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { runAutomationsNowAction } from "@/lib/actions/automations";

export function RunAutomationsButton({ orgSlug }: { orgSlug: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await runAutomationsNowAction(orgSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const { evaluated, generated, errors } = result.data!;
      if (errors.length > 0) {
        toast.warning(`${generated} bon(s) généré(s) sur ${evaluated} déclencheur(s) évalué(s) — ${errors.length} erreur(s).`);
      } else {
        toast.success(`${generated} bon(s) de travail généré(s) sur ${evaluated} déclencheur(s) évalué(s).`);
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={pending}>
      <PlayCircle /> {pending ? "Vérification…" : "Vérifier maintenant"}
    </Button>
  );
}
