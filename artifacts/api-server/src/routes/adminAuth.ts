import { Router, type Request, type Response } from "express";
import { signToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const adminAuthRouter = Router();

adminAuthRouter.post("/admin/auth/login", (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    logger.error("ADMIN_PASSWORD secret is not set");
    res.status(500).json({ error: "Admin password is not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = signToken({ role: "admin" });
  res.json({ token });
});

export default adminAuthRouter;
