import { Router, Request, Response } from "express";
import { authMiddleware } from "./utils.js";

const router: Router = Router();

router.get("/id-fix", authMiddleware, (req: Request, res: Response) => {
  res.send("ID-Fix is live!");
});

export default router;
