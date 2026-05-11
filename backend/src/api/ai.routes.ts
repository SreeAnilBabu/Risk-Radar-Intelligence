import { Router, type Request, type Response } from "express";
import { aiBriefingRequestSchema, aiQueryRequestSchema, simulationRequestSchema } from "../types/domain";
import { createBriefing, answerRiskQuery } from "../services/aiMock.service";
import { askMatterQuestion, composeSmartBriefing } from "../services/aiBriefing.service";
import { runSimulation } from "../services/simulation.service";

export const aiRouter = Router();

aiRouter.post("/briefing", async (request: Request, response: Response) => {
  const parsed = aiBriefingRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    response.status(400).json({ error: { code: "invalid_request", message: "Briefing payload is invalid." } });
    return;
  }

  const data = await createBriefing(parsed.data);
  response.json({ data });
});

aiRouter.post("/query", async (request: Request, response: Response) => {
  const parsed = aiQueryRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "invalid_request", message: "Query payload is invalid." } });
    return;
  }

  const data = await answerRiskQuery(parsed.data.question);
  response.json({ data });
});

aiRouter.post("/simulate", async (request: Request, response: Response) => {
  const parsed = simulationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { code: "invalid_request", message: "Simulation payload is invalid." } });
    return;
  }

  const data = await runSimulation(parsed.data.prompt, parsed.data.baselineJurisdictionIds);
  response.json({ data });
});

/**
 * POST /api/ai/matter-briefing
 * Body: { matterId: string }
 *
 * Returns a richer, matter-specific briefing assembled from real Passport
 * context. Uses OpenAI when `OPENAI_API_KEY` is configured; otherwise the
 * deterministic local generator. UI gets the same shape either way.
 */
aiRouter.post("/matter-briefing", async (request: Request, response: Response) => {
  const matterId = typeof request.body?.matterId === "string" ? request.body.matterId.trim() : "";
  if (!matterId) {
    response.status(400).json({ error: { code: "invalid_request", message: "matterId is required." } });
    return;
  }
  const data = await composeSmartBriefing(matterId);
  if (!data) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }
  response.json({ data });
});

/**
 * POST /api/ai/matter-ask
 * Body: { matterId: string, question: string }
 *
 * Lightweight Q&A — answers a single question grounded in the matter's
 * real Passport context (budget, vendor, invoice velocity, related
 * matters). Falls back to a keyword-routed answer when no LLM key is set.
 */
aiRouter.post("/matter-ask", async (request: Request, response: Response) => {
  const matterId = typeof request.body?.matterId === "string" ? request.body.matterId.trim() : "";
  const question = typeof request.body?.question === "string" ? request.body.question.trim() : "";
  if (!matterId || !question) {
    response.status(400).json({ error: { code: "invalid_request", message: "matterId and question are required." } });
    return;
  }
  const data = await askMatterQuestion(matterId, question);
  if (!data) {
    response.status(404).json({ error: { code: "not_found", message: "Matter not found." } });
    return;
  }
  response.json({ data });
});
