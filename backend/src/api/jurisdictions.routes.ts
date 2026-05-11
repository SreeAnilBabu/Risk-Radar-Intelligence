import { Router, type Request, type Response } from "express";
import { loadJurisdictions } from "../data/loaders";

export const jurisdictionsRouter = Router();

jurisdictionsRouter.get("/", async (_request: Request, response: Response) => {
  const risks = await loadJurisdictions();
  response.json({
    data: risks.map((item) => ({ id: item.id, name: item.name, code: item.code }))
  });
});
