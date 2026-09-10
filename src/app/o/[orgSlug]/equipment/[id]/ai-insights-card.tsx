"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estimateEquipmentRiskAction, summarizeEquipmentHistoryAction } from "@/lib/actions/ai";

const RISK_LABELS: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  low: { label: "Risque faible", variant: "success" },
  medium: { label: "Risque modéré", variant: "warning" },
  high: { label: "Risque élevé", variant: "destructive" },
};

/**
 * Every result here is an AI suggestion, never presented as fact — see the
 * "estimation, pas un fait" framing baked into the prompts in
 * src/lib/ai/anthropic-provider.ts. When ANTHROPIC_API_KEY isn't set, both
 * actions resolve to {available: false} and this card explains why instead
 * of silently doing nothing.
 */
export function AiInsightsCard({ equipmentId }: { equipmentId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [risk, setRisk] = useState<{ riskLevel: string; rationale: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSummary() {
    startTransition(async () => {
      const result = await summarizeEquipmentHistoryAction(equipmentId);
      if (!result.available) setNotice(result.reason);
      else setSummary(result.summary);
    });
  }

  function runRisk() {
    startTransition(async () => {
      const result = await estimateEquipmentRiskAction(equipmentId);
      if (!result.available) setNotice(result.reason);
      else setRisk(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" /> Assistant IA
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {notice && <p className="rounded-md bg-secondary p-2 text-muted-foreground">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={runSummary} disabled={pending}>
            Résumer l’historique
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={runRisk} disabled={pending}>
            Estimer le niveau de risque
          </Button>
        </div>

        {summary && <p className="rounded-md border p-3 whitespace-pre-wrap">{summary}</p>}

        {risk && (
          <div className="rounded-md border p-3">
            <Badge variant={RISK_LABELS[risk.riskLevel]?.variant ?? "outline"} className="mb-2">
              {RISK_LABELS[risk.riskLevel]?.label ?? risk.riskLevel}
            </Badge>
            <p className="text-muted-foreground">{risk.rationale}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimation générée par IA à titre indicatif — ne remplace pas le jugement d’un technicien.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
