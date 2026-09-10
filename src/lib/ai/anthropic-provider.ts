import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type {
  AiProvider,
  AiResult,
  FailureCauseSuggestion,
  FailureRiskEstimate,
  ProcedureSuggestion,
} from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("no JSON object found in model response");
  return JSON.parse(match[0]);
}

/**
 * Every method here asks Claude for a small, strictly-JSON response and
 * parses it defensively (no structured-outputs beta dependency, no
 * assumptions beyond "the model returned parseable JSON somewhere in its
 * text") — a parse failure or API error degrades to `{available: false}`
 * rather than throwing, so a flaky AI call never breaks the underlying
 * CRUD workflow it's attached to.
 */
export class AnthropicAiProvider implements AiProvider {
  readonly isConfigured = true;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private async completeJson<T>(system: string, user: string): Promise<AiResult<T>> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      });

      if (response.stop_reason === "refusal") {
        return { available: false, reason: "La demande a été refusée par le fournisseur IA." };
      }

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return { available: false, reason: "Réponse IA vide." };
      }

      const parsed = extractJson(textBlock.text) as T;
      return { available: true, ...parsed } as AiResult<T>;
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : "Erreur inconnue du service IA.",
      };
    }
  }

  async suggestProcedureFromManual(input: { equipmentName: string; manualText: string }) {
    return this.completeJson<{ suggestion: ProcedureSuggestion }>(
      "Tu es un assistant qui aide des équipes de maintenance industrielle à créer des procédures " +
        "d'inspection à partir d'extraits de manuels d'équipement. Réponds UNIQUEMENT avec un objet JSON " +
        'de la forme {"suggestion": {"name": string, "description": string, "fields": ' +
        '[{"label": string, "type": "checkbox"|"yesno"|"number"|"free_text"|"pass_fail"|"meter_reading", ' +
        '"isRequired": boolean, "config": object}]}}. Propose entre 4 et 10 étapes concrètes et vérifiables. ' +
        "Aucun texte hors du JSON.",
      `Équipement : ${input.equipmentName}\n\nExtrait du manuel :\n${input.manualText.slice(0, 8000)}`,
    );
  }

  async summarizeEquipmentHistory(input: {
    equipmentName: string;
    workOrders: Array<{ title: string; type: string; status: string; closedAt: string | null; resolution: string | null }>;
  }) {
    return this.completeJson<{ summary: string }>(
      "Tu résumes l'historique de maintenance d'un équipement industriel pour un gestionnaire pressé. " +
        'Réponds UNIQUEMENT avec {"summary": string} en français, 4-6 phrases, factuel, sans invention. ' +
        "Si l'historique est vide, dis-le simplement.",
      `Équipement : ${input.equipmentName}\n\nBons de travail (${input.workOrders.length}) :\n${JSON.stringify(input.workOrders.slice(0, 30))}`,
    );
  }

  async suggestFailureCauses(input: { equipmentName: string; problemDescription: string; priorFailures: string[] }) {
    return this.completeJson<{ suggestions: FailureCauseSuggestion[] }>(
      "Tu es un expert en fiabilité industrielle qui suggère des causes possibles à une panne, à valider " +
        'par un technicien. Réponds UNIQUEMENT avec {"suggestions": [{"cause": string, "rationale": string, ' +
        '"confidence": "low"|"medium"|"high"}]}, 3 à 5 causes plausibles, triées par confiance décroissante. ' +
        "Ce sont des hypothèses à vérifier, jamais des certitudes — formule-les comme telles.",
      `Équipement : ${input.equipmentName}\nProblème signalé : ${input.problemDescription}\n` +
        `Pannes précédentes similaires : ${input.priorFailures.join("; ") || "aucune connue"}`,
    );
  }

  async structureRequestFromText(input: { rawText: string; equipmentOptions: string[] }) {
    return this.completeJson<{
      title: string;
      description: string;
      urgency: "low" | "medium" | "high" | "critical";
      isEquipmentDown: boolean;
      matchedEquipmentName: string | null;
    }>(
      "Tu transformes une description libre (souvent dictée à voix haute) en une demande de maintenance " +
        'structurée. Réponds UNIQUEMENT avec {"title": string (court), "description": string, ' +
        '"urgency": "low"|"medium"|"high"|"critical", "isEquipmentDown": boolean, ' +
        '"matchedEquipmentName": string|null (un des noms fournis s\'il correspond clairement, sinon null)}.',
      `Équipements connus : ${input.equipmentOptions.join(", ") || "aucun"}\n\nDescription : ${input.rawText}`,
    );
  }

  async generateShiftSummary(input: {
    orgName: string;
    completedWorkOrders: Array<{ title: string; equipmentName: string | null }>;
    openCriticalWorkOrders: Array<{ title: string; equipmentName: string | null }>;
  }) {
    return this.completeJson<{ summary: string }>(
      'Tu rédiges un résumé de fin de quart pour une équipe de maintenance. Réponds UNIQUEMENT avec {"summary": string}, ' +
        "en français, structuré en deux courtes sections : travaux complétés, points d'attention pour le prochain quart.",
      `Organisation : ${input.orgName}\nTerminés (${input.completedWorkOrders.length}) : ${JSON.stringify(input.completedWorkOrders)}\n` +
        `Critiques ouverts (${input.openCriticalWorkOrders.length}) : ${JSON.stringify(input.openCriticalWorkOrders)}`,
    );
  }

  async answerReportQuestion(input: { question: string; dataSnapshot: Record<string, unknown> }) {
    return this.completeJson<{ answer: string }>(
      "Tu réponds à une question en langage naturel sur des données de maintenance déjà agrégées et fournies " +
        'ci-dessous — tu n\'as accès à aucune autre donnée et ne dois jamais en inventer. Réponds UNIQUEMENT avec ' +
        '{"answer": string}. Si les données fournies ne permettent pas de répondre, dis-le clairement.',
      `Question : ${input.question}\n\nDonnées disponibles :\n${JSON.stringify(input.dataSnapshot).slice(0, 12000)}`,
    );
  }

  async estimateFailureRisk(input: {
    equipmentName: string;
    recentFailureCount: number;
    daysSinceLastPm: number | null;
    criticality: string;
  }) {
    return this.completeJson<FailureRiskEstimate>(
      'Tu estimes un NIVEAU DE RISQUE indicatif (pas une prédiction certaine) qu\'un équipement tombe en panne ' +
        'prochainement, à partir de quelques signaux simples. Réponds UNIQUEMENT avec {"riskLevel": "low"|"medium"|"high", ' +
        '"rationale": string (2-3 phrases, en précisant qu\'il s\'agit d\'une estimation, pas d\'un fait)}.',
      `Équipement : ${input.equipmentName}\nCriticité déclarée : ${input.criticality}\n` +
        `Pannes récentes (90 jours) : ${input.recentFailureCount}\n` +
        `Jours depuis le dernier entretien préventif : ${input.daysSinceLastPm ?? "inconnu"}`,
    );
  }
}
