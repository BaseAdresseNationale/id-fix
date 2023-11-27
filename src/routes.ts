import { Router, Request, Response } from "express";
import { logger } from "./utils/logger.js";
import authMiddleware from "./middleware/auth.js";
import {
  getRevisionFromDistrictCOG,
  getRevisionFileText,
} from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import { getDistrictFromCOG, partialUpdateDistricts } from "./ban-api/index.js";
import {
  checkIfBALUseBanId,
  csvBalToJsonBal,
  getBalVersion,
} from "./bal-converter/helpers/index.js";

import acceptedCogList from "./accepted-cog-list.json" assert { type: "json" };

const router: Router = Router();

router.get(
  "/compute-from-cog/:cog",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      let responseBody;
      const { cog } = req.params;

      // Get revision from dump-api (api de dépôt)
      const revision = await getRevisionFromDistrictCOG(cog);
      const revisionFileText = await getRevisionFileText(revision._id);

      // Convert csv to json
      const bal = csvBalToJsonBal(revisionFileText);

      // Detect BAL version
      const version = getBalVersion(bal);
      logger.info(`District cog ${cog} is using BAL version ${version}`);

      // Temporary check for testing purpose
      // Check if cog is part of the accepted cog list
      const isCogAccepted = acceptedCogList.includes(cog);

      // Check if bal is using BanID on all address lines
      // If not, send process to ban-plateforme legacy API
      const useBanId = await checkIfBALUseBanId(bal, version);

      if (!useBanId || !isCogAccepted) {
        const message = `District cog ${cog} do not support BanID`;
        responseBody = {
          message,
        };
        logger.info(message);
        // TODO: send process to ban-plateforme legacy API
      } else {
        logger.info(`District cog ${cog} is using banID`);
        // Update District with revision data
        const districtResponseRaw = await getDistrictFromCOG(cog);
        if (!districtResponseRaw.length) {
          throw new Error(`No district found with cog ${cog}`);
        } else if (districtResponseRaw.length > 1) {
          throw new Error(
            `Multiple district found with cog ${cog}. Behavior not handled yet.`
          );
        }

        const { id } = districtResponseRaw[0];
        logger.info(`District with cog ${cog} found (id: ${id})`);

        // Update District meta with revision data from dump-api (id and date)
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

        responseBody = (await sendBalToBan(bal)) || {};
        logger.info(
          `District id ${id} update in BAN BDD. Response body : ${JSON.stringify(
            responseBody
          )}`
        );
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
