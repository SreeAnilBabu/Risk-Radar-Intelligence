import { Router, type Request, type Response } from "express";
import { loadJurisdictions } from "../data/loaders";
import { listRiskTrends } from "../services/trends.service";
import { getRefreshTimestamp } from "../services/refreshTicker";

export const risksRouter = Router();

risksRouter.get("/", async (_request: Request, response: Response) => {
  const data = await loadJurisdictions();
  response.json({ data, refreshedAt: getRefreshTimestamp() });
});

risksRouter.get("/trends", async (request: Request, response: Response) => {
  const jurisdictionId = typeof request.query.jurisdictionId === "string" ? request.query.jurisdictionId : undefined;
  const data = await listRiskTrends(jurisdictionId);
  response.json({ data });
});

risksRouter.get("/:jurisdictionId", async (request: Request, response: Response) => {
  const data = await loadJurisdictions();
  const jurisdiction = data.find((item) => item.id === request.params.jurisdictionId);

  if (!jurisdiction) {
    response.status(404).json({ error: { code: "not_found", message: "Jurisdiction risk profile not found." } });
    return;
  }

  response.json({ data: jurisdiction });
});
