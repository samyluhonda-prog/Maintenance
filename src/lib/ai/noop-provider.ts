import type { AiProvider, AiResult } from "./types";

const UNAVAILABLE: AiResult<never> = {
  available: false,
  reason: "L’assistant IA n’est pas configuré pour cette organisation (ANTHROPIC_API_KEY absente).",
};

/** Used whenever ANTHROPIC_API_KEY is unset — every method resolves to "unavailable" instead of the app crashing or faking output. */
export class NoopAiProvider implements AiProvider {
  readonly isConfigured = false;

  async suggestProcedureFromManual() {
    return UNAVAILABLE;
  }
  async summarizeEquipmentHistory() {
    return UNAVAILABLE;
  }
  async suggestFailureCauses() {
    return UNAVAILABLE;
  }
  async structureRequestFromText() {
    return UNAVAILABLE;
  }
  async generateShiftSummary() {
    return UNAVAILABLE;
  }
  async answerReportQuestion() {
    return UNAVAILABLE;
  }
  async estimateFailureRisk() {
    return UNAVAILABLE;
  }
}
