import { Router, Request, Response } from 'express';
import { logger } from './utils/logger.js';
import authMiddleware from './middleware/auth.js';
import { computeFromCog } from './compute-from-cog.js';
import sendMessageToWebHook from './utils/send-message-to-hook.js';

const router: Router = Router();

// Route to compute BAL from a single COG
router.get(
  '/compute-from-cog/:cog',
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    const { cog } = req.params;
    const { force: forceLegacyCompose } = req.query;
    try {
      const responseBody = await computeFromCog(
        cog,
        forceLegacyCompose as string
      );

      response = {
        date: new Date(),
        status: 'success',
        response: responseBody,
      };
    } catch (error) {
      const { message } = error as Error;
      const finalMessage = `Error computing cog \`${cog}\` : ${message}`;
      logger.error(finalMessage);
      await sendMessageToWebHook(finalMessage);
      response = {
        date: new Date(),
        status: "error",
        mesage: finalMessage,
        response: {},
      };
    }

    res.send(response);
  }
);

// Route to compute BAL from multiple COGs
router.post(
  '/compute-from-cogs',
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    const { cogs } = req.body;
    const forceLegacyCompose = req.query.force as string;
    try {
      if (!cogs || !Array.isArray(cogs)) {
        throw new Error("Invalid or missing 'cogs' data in the request body");
      }

      const responses = [];
      for (let i = 0; i < cogs.length; i++) {
        try {
          const response = await computeFromCog(
            cogs[i],
            forceLegacyCompose as string
          );
          responses.push(response);
        } catch (error) {
          const { message } = error as Error;
          const finalMessage = `Error computing cog \`${cogs[i]}\` : ${message}`;
          logger.error(finalMessage);
          await sendMessageToWebHook(finalMessage);
          responses.push(finalMessage);
        }
      }

      response = {
        date: new Date(),
        status: 'success',
        response: responses,
      };
    } catch (error) {
      const { message } = error as Error;
      logger.error(message);
      await sendMessageToWebHook(message);
      response = {
        date: new Date(),
        status: 'error',
        message,
        response: {},
      };
    }

    res.send(response);
  }
);

export default router;
