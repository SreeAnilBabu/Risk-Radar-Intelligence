import { Router, type Request, type Response } from "express";
import { alertActionSchema, alertStatusSchema } from "../types/domain";
import { listAlerts, updateAlert } from "../services/alerts.service";

export const alertsRouter = Router();

alertsRouter.get("/", async (request: Request, response: Response) => {
  const rawStatus = typeof request.query.status === "string" ? request.query.status : undefined;
  const parsedStatus = rawStatus ? alertStatusSchema.safeParse(rawStatus) : undefined;

  if (rawStatus && !parsedStatus?.success) {
    response.status(400).json({ error: { code: "invalid_status", message: "Unsupported alert status filter." } });
    return;
  }

  const payload = await listAlerts(parsedStatus?.success ? parsedStatus.data : undefined);
  response.json(payload);
});

alertsRouter.patch("/:id", async (request: Request, response: Response) => {
  const parsedAction = alertActionSchema.safeParse(request.body?.action);
  if (!parsedAction.success) {
    response.status(400).json({ error: { code: "invalid_action", message: "Alert action must be mark_read, snooze, or escalate." } });
    return;
  }

  const payload = await updateAlert(request.params.id, parsedAction.data);
  if (!payload) {
    response.status(404).json({ error: { code: "not_found", message: "Alert not found." } });
    return;
  }

  response.json(payload);
});
