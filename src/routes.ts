import { Router, Request, Response } from "express";
import { logger } from "./utils/logger.js";
import authMiddleware from "./middleware/auth.js";
import { computeFromCog } from "./compute-from-cog.js";


const router: Router = Router();

router.get(
  "/compute-from-cog/:cog",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      const { cog } = req.params;
      const { force : forceLegacyCompose } = req.query;

      const responseBody = await computeFromCog(cog, forceLegacyCompose as string);
      
      response = {
        date: new Date(),
        status: "success",
        response: responseBody,
      };
    } catch (error) {
      const { message } = error as Error;
      logger.error(message);
      response = {
        date: new Date(),
        status: "error",
        message,
        response: {},
      };
    }

    res.send(response);
  }
);

router.post(
  "/compute-from-cogs",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      const { cogs } = req.body;
      const forceLegacyCompose = req.query.force as string;

      if (!cogs || !Array.isArray(cogs)) {
        throw new Error("Invalid or missing 'cogs' data in the request body");
      }

      const responses = [] 
      for (let i = 0; i < cogs.length; i++) {
        try {
          const response = await computeFromCog(cogs[i], forceLegacyCompose as string)
          responses.push(response)
        } catch (error) {
          const { message } = error as Error;
          logger.error(message);
          responses.push(`Error for cog ${cogs[i]}: ${message}`);
        }
      }

      response = {
        date: new Date(),
        status: "success",
        response: responses,
      };
    } catch (error) {
      const { message } = error as Error;
      logger.error(message);
      response = {
        date: new Date(),
        status: "error",
        message,
        response: {},
      };
    }

    res.send(response);
  }
);

export default router;
