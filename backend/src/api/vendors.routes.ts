import { Router, type Request, type Response } from "express";
import { loadVendors } from "../data/loaders";

export const vendorsRouter = Router();

vendorsRouter.get("/", async (_request: Request, response: Response) => {
  const data = await loadVendors();
  response.json({ data });
});
