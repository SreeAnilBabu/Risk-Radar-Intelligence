import { loadAlerts, loadJurisdictions, loadMatters } from "../data/loaders";
import { interpretRiskQuery } from "./queryInterpreter.service";
import { type AIBriefing, type AIBriefingRequest, type AIQueryResponse } from "../types/domain";

export async function createBriefing(request: AIBriefingRequest): Promise<AIBriefing> {
  const startedAt = Date.now();
  const [jurisdictions, alerts] = await Promise.all([loadJurisdictions(), loadAlerts()]);
  const focusIds = request.jurisdictionIds && request.jurisdictionIds.length > 0
    ? new Set(request.jurisdictionIds)
    : undefined;

  const highlighted = jurisdictions
    .filter((item) => !focusIds || focusIds.has(item.id))
    .sort((left, right) => right.overallRiskScore - left.overallRiskScore)
    .slice(0, 3);

  const topRisks = highlighted.map((item) => `${item.name} is ${item.riskLevel} at ${item.overallRiskScore} with ${item.openAlerts} open alerts.`);
  const changesSinceYesterday = [
    "California remains critical as labor exposure and deadline compression climbed again.",
    "New York regulatory pressure accelerated after updated labor guidance.",
    "Texas moved closer to critical monitoring as multiple matters trended upward."
  ];
  const recommendedActions = [
    "Escalate the New York regulatory response queue and confirm executive owner coverage.",
    "Review California employment reserves against the latest filing wave.",
    "Shift additional outside counsel bandwidth into Texas before the next deadline cluster."
  ];
  const narrative = `RiskRadar shows a concentrated employment-risk story: California and New York remain critical, while Texas is the jurisdiction moving fastest toward the high-risk edge. ${alerts.filter((alert) => alert.status === "escalated").length} alert is already pinned in the escalation queue, reinforcing the need for immediate labor-response coordination.`;

  return {
    id: `briefing-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    topRisks,
    changesSinceYesterday,
    recommendedActions,
    narrative,
    latencyMs: Date.now() - startedAt
  };
}

export async function answerRiskQuery(question: string): Promise<AIQueryResponse> {
  const [jurisdictions, matters, alerts] = await Promise.all([loadJurisdictions(), loadMatters(), loadAlerts()]);
  const interpretation = interpretRiskQuery(question);

  if (interpretation.answerTheme === "ambiguous") {
    return {
      id: `query-${Date.now()}`,
      question,
      answer: "I can focus on a jurisdiction, the alert queue, or trend movement. Ask for California, New York, Texas, or a specific alert pattern to refine the answer.",
      relatedJurisdictionIds: [],
      relatedMatterIds: [],
      suggestedNextQuestions: [
        "Why is California still critical?",
        "Which alerts are escalated right now?",
        "Why is Texas rising?"
      ],
      generatedAt: new Date().toISOString()
    };
  }

  const relatedJurisdictions = interpretation.jurisdictionHints.length > 0
    ? jurisdictions.filter((item) => interpretation.jurisdictionHints.includes(item.id))
    : jurisdictions.filter((item) => ["US-CA", "US-NY", "US-TX"].includes(item.id));

  const relatedMatterIds = matters
    .filter((matter) => relatedJurisdictions.some((jurisdiction) => jurisdiction.id === matter.jurisdictionId))
    .slice(0, 4)
    .map((matter) => matter.id);

  const escalatedCount = alerts.filter((alert) => alert.status === "escalated").length;
  const answer = interpretation.answerTheme === "alerts"
    ? `There are ${escalatedCount} escalated alerts, led by New York's regulatory change. California still has the highest operational risk pressure, while Texas is the queue item most likely to escalate next.`
    : interpretation.answerTheme === "trend"
      ? "Texas is the clearest rising trend because deadline pressure and vendor performance risk have both ticked up across two active matters. California and New York are already critical, so their story is persistence rather than acceleration."
      : "California and New York remain critical because their financial exposure, complexity, and regulatory volatility all sit near the top of the portfolio. Texas is the fastest mover because its matter mix is becoming more deadline-driven and operationally fragile.";

  return {
    id: `query-${Date.now()}`,
    question,
    answer,
    relatedJurisdictionIds: relatedJurisdictions.map((item) => item.id),
    relatedMatterIds,
    suggestedNextQuestions: [
      "Show me the Texas driver matters.",
      "Which alert should I escalate next?",
      "What changed in New York since yesterday?"
    ],
    generatedAt: new Date().toISOString()
  };
}
