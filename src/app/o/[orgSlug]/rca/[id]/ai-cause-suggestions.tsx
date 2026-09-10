"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { suggestFailureCausesAction } from "@/lib/actions/ai";
import type { FailureCauseSuggestion } from "@/lib/ai/types";

const CONFIDENCE_LABELS: Record<string, string> = { low: "Faible confiance", medium: "Confiance moyenne", high: "Bonne confiance" };

export function AiCauseSuggestions({ equipmentName, problemDescription }: { equipmentName: string; problemDescription: string }) {
  const [suggestions, setSuggestions] = useState<FailureCauseSuggestion[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await suggestFailureCausesAction(equipmentName, problemDescription);
      if (!result.available) setNotice(result.reason);
      else setSuggestions(result.suggestions);
    });
  }

  return (
    <div className="grid gap-3 text-sm">
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={pending} className="w-fit">
        <Sparkles className="size-3.5" /> Suggérer des causes possibles
      </Button>
      {notice && <p className="text-muted-foreground">{notice}</p>}
      {suggestions && (
        <ul className="grid gap-2">
          {suggestions.map((s, i) => (
            <li key={i} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{s.cause}</span>
                <Badge variant="outline">{CONFIDENCE_LABELS[s.confidence] ?? s.confidence}</Badge>
              </div>
              <p className="text-muted-foreground">{s.rationale}</p>
            </li>
          ))}
          <li className="text-xs text-muted-foreground">
            Hypothèses générées par IA à valider par un technicien — pas des causes confirmées.
          </li>
        </ul>
      )}
    </div>
  );
}
