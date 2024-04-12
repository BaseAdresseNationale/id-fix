// Get revision from dump-api (api de dépôt)
import { logger } from "./utils/logger.js";
import {
  getRevisionFromDistrictCOG,
  getRevisionFileText,
} from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import { getDistrictFromCOG, partialUpdateDistricts, sendBalToLegacyCompose } from "./ban-api/index.js";
import {
  checkIfBALUseBanId,
  csvBalToJsonBal,
  getBalVersion,
} from "./bal-converter/helpers/index.js";

import acceptedCogList from "./accepted-cog-list.json" assert { type: "json" };

export const computeFromCog = async (cog: string, forceLegacyCompose: string) => {
  const revision = await getRevisionFromDistrictCOG(cog);
  console.log("revision", revision)
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
    logger.info(message);
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string)
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

    const result = (await sendBalToBan(bal)) || {};

    if (!Object.keys(result).length) {
      const response = `District id ${id} not updated in BAN BDD. No changes detected.`
      logger.info(response);
      return response;
    }

    logger.info(
      `District id ${id} updated in BAN BDD. Response body : ${JSON.stringify(
        result
      )}`
    );
    
    return result;
  }
}