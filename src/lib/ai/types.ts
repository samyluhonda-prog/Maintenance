/**
 * Every AI feature in Intervia is optional and additive: the app is fully
 * usable with ANTHROPIC_API_KEY unset (the no-op provider below just
 * reports itself unavailable), and every AI output is explicitly labeled a
 * suggestion in the UI — never presented as a fact or auto-applied without
 * a human reviewing it first.
 */

export type AiUnavailable = { available: false; reason: string };
export type AiResult<T> = ({ available: true } & T) | AiUnavailable;

export type ProcedureFieldSuggestion = {
  label: string;
  type: string;
  isRequired: boolean;
  config: Record<string, unknown>;
};

export type ProcedureSuggestion = {
  name: string;
  description: string;
  fields: ProcedureFieldSuggestion[];
};

export type FailureCauseSuggestion = {
  cause: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
};

export type FailureRiskEstimate = {
  riskLevel: "low" | "medium" | "high";
  rationale: string;
};

export interface AiProvider {
  readonly isConfigured: boolean;

  /** Reads extracted manual text (already OCR'd/parsed elsewhere) and proposes a procedure. */
  suggestProcedureFromManual(input: {
    equipmentName: string;
    manualText: string;
  }): Promise<AiResult<{ suggestion: ProcedureSuggestion }>>;

  /** Summarizes an equipment's maintenance history into a short brief. */
  summarizeEquipmentHistory(input: {
    equipmentName: string;
    workOrders: Array<{ title: string; type: string; status: string; closedAt: string | null; resolution: string | null }>;
  }): Promise<AiResult<{ summary: string }>>;

  /** Suggests possible causes for a failure description, ranked. */
  suggestFailureCauses(input: {
    equipmentName: string;
    problemDescription: string;
    priorFailures: string[];
  }): Promise<AiResult<{ suggestions: FailureCauseSuggestion[] }>>;

  /** Turns a free-form (often dictated) description into a structured request draft. */
  structureRequestFromText(input: {
    rawText: string;
    equipmentOptions: string[];
  }): Promise<
    AiResult<{
      title: string;
      description: string;
      urgency: "low" | "medium" | "high" | "critical";
      isEquipmentDown: boolean;
      matchedEquipmentName: string | null;
    }>
  >;

  /** Generates a short end-of-shift summary from the day's work order activity. */
  generateShiftSummary(input: {
    orgName: string;
    completedWorkOrders: Array<{ title: string; equipmentName: string | null }>;
    openCriticalWorkOrders: Array<{ title: string; equipmentName: string | null }>;
  }): Promise<AiResult<{ summary: string }>>;

  /** Answers a natural-language question against a small, pre-aggregated data snapshot (never raw SQL/DB access). */
  answerReportQuestion(input: {
    question: string;
    dataSnapshot: Record<string, unknown>;
  }): Promise<AiResult<{ answer: string }>>;

  /** A clearly-labeled estimate, never a certainty — always phrased as such downstream. */
  estimateFailureRisk(input: {
    equipmentName: string;
    recentFailureCount: number;
    daysSinceLastPm: number | null;
    criticality: string;
  }): Promise<AiResult<FailureRiskEstimate>>;
}
