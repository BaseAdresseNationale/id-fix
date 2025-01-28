// Get revision from dump-api (api de dépôt)
import { logger } from './utils/logger.js';
import {
  getRevisionFromDistrictCOG,
  getRevisionFileText,
} from './dump-api/index.js';
import { sendBalToBan } from './bal-converter/index.js';
import {
  getDistrictFromCOG,
  partialUpdateDistricts,
  sendBalToLegacyCompose,
} from './ban-api/index.js';
import {
  validator,
  csvBalToJsonBal,
  getBalVersion,
} from './bal-converter/helpers/index.js';

import acceptedCogList from './accepted-cog-list.json' with { type: 'json' };

export const computeFromCog = async (
  cog: string,
  forceLegacyCompose: string
) => {
  // Temporary check for testing purpose
  // Check if cog is part of the accepted cog list
  const isCogAccepted = acceptedCogList.includes(cog);

  if (!isCogAccepted) {
    logger.info(
      `District cog ${cog} is not part of the whitelist: sending BAL to legacy compose...`
    );
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  }

  logger.info(`District cog ${cog} is part of the whitelist.`);

  const revision = await getRevisionFromDistrictCOG(cog);
  const revisionFileText = await getRevisionFileText(revision._id);

  // Convert csv to json
  const bal = csvBalToJsonBal(revisionFileText);

  // Detect BAL version
  const version = getBalVersion(bal);
  logger.info(`District cog ${cog} is using BAL version ${version}`);

  const districtResponseRaw = await getDistrictFromCOG(cog);
  if (!districtResponseRaw.length) {
    throw new Error(`No district found with cog ${cog}`);
  } else if (districtResponseRaw.length > 1) {
    throw new Error(
      `Multiple district found with cog ${cog}. Behavior not handled yet.`
    );
  }

  const { id } = districtResponseRaw[0];

  // Check if bal is using BanID
  // If not, send process to ban-plateforme legacy API
  // If the use of IDs is partial, throwing an error
  const useBanId = await validator(bal, version, { cog, districtID: id });

  if (!useBanId) {
    logger.info(
      `District id ${id} (cog: ${cog}) does not use BanID: sending BAL to legacy compose...`
    );
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  } else {
    logger.info(`District id ${id} (cog: ${cog}) is using banID`);
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
      const response = `District id ${id} (cog: ${cog}) not updated in BAN BDD. No changes detected.`;
      logger.info(response);
      return response;
    }

    logger.info(
      `District id ${id} (cog: ${cog}) updated in BAN BDD. Response body : ${JSON.stringify(
        result
      )}`
    );

    return result;
  }
};
