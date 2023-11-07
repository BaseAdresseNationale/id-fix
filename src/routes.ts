import { Router, Request, Response } from "express";
import { logger } from "./utils/logger.js";
import authMiddleware from "./middleware/auth.js";
import {
  getRevisionFromDistrictCOG,
  getRevisionFileText,
} from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import { getDistrictFromCOG, partialUpdateDistricts } from "./ban-api/index.js";

const router: Router = Router();

router.get(
  "/district/cog/:cog",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      let responseBody;
      const { cog } = req.params;

      const districtResponseRaw = await getDistrictFromCOG(cog);
      if (!districtResponseRaw.length) {
        throw new Error(`No district found with cog ${cog}`);
      } else if (districtResponseRaw.length > 1) {
        throw new Error(
          `Multiple district found with cog ${cog}. Behavior not handled yet.`
        );
      }

      const { id, config } = districtResponseRaw[0];
      const useBanId = config?.useBanId;
      if (!useBanId) {
        throw new Error(`District id ${id} do not support BanID`);
        // TODO: Build Exploitation BDD (Legacy) by Legacy compose
      } else {
        const revision = await getRevisionFromDistrictCOG(cog);
        const revisionFileText = await getRevisionFileText(revision._id);

        // Update District with revision data
        const districtUpdate = {
          id,
          meta: {
            bal: {
              idRevision: revision._id,
              dateRevision: revision.publishedAt,
            },
          },
        };
        await partialUpdateDistricts([districtUpdate]);

        responseBody = (await sendBalToBan(revisionFileText)) || {};
        logger.info(
          `District id ${id} update in BAN BDD. Response body : ${JSON.stringify(responseBody)}`,
        );

        // TODO: Build Exploitation BDD (Legacy) from BAN BDD
      }

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

export default router;
