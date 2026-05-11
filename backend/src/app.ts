import cors from "cors";
import express, { type Request, type Response } from "express";
import { risksRouter } from "./api/risks.routes";
import { mattersRouter } from "./api/matters.routes";
import { jurisdictionsRouter } from "./api/jurisdictions.routes";
import { alertsRouter } from "./api/alerts.routes";
import { vendorsRouter } from "./api/vendors.routes";
import { aiRouter } from "./api/ai.routes";
import { portfolioRouter } from "./api/portfolio.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/risks", risksRouter);
  app.use("/api/matters", mattersRouter);
  app.use("/api/jurisdictions", jurisdictionsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/vendors", vendorsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/portfolio", portfolioRouter);

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ error: { code: "not_found", message: "Route not found." } });
  });

  return app;
}
