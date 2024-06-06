// Get revision from dump-api (api de dépôt)
import { logger } from "./utils/logger.js";
import {
  getRevisionFromDistrictCOG,
  getRevisionFileText,
} from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import {
  getDistrictFromCOG,
  partialUpdateDistricts,
  sendBalToLegacyCompose,
  sendProcessingReport,
} from "./ban-api/index.js";
import {
  checkIfBALUseBanId,
  csvBalToJsonBal,
  getBalVersion,
} from "./bal-converter/helpers/index.js";

import acceptedCogList from "./accepted-cog-list.json" assert { type: "json" };
import { buildPreProcessingReport } from "./utils/report.js";

export const computeFromCog = async (
  cog: string,
  forceLegacyCompose: string
) => {
  // Get revision data from dump-api
  const revision = await getRevisionFromDistrictCOG(cog);
  
  if (!revision) {
    throw new Error(`No revision found for cog ${cog}`);
  }

  const { _id: revisionId, publishedAt: revisionPublishedAt  } = revision;

  // Get district data from ban-api
  const districtResponseRaw = await getDistrictFromCOG(cog);
  if (!districtResponseRaw || !districtResponseRaw.length) {
    throw new Error(`No district found with cog ${cog}`);
  } else if (districtResponseRaw.length > 1) {
    throw new Error(
      `Multiple district found with cog ${cog}. Behavior not handled yet.`
    );
  }

  const { id: districtId } = districtResponseRaw[0];
  if (!districtId) {
    throw new Error(`No district id found with cog ${cog}`);
  }

  logger.info(`District with cog ${cog} found (id: ${districtId})`);

  // Temporary check for testing purpose
  // Check if cog is part of the accepted cog list
  const isCogAccepted = acceptedCogList.includes(cog);

  if (!isCogAccepted) {
    const message = `Redirected to legacy : District id ${districtId} (cog: ${cog}) is not part of the whitelist.`;
    logger.info(message);

    const processingReport = buildPreProcessingReport(0, message, {}, {targetedPlateform: "legacy", revision, cog});
    await sendProcessingReport(districtId, processingReport);
    
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  }

  logger.info(`District id ${districtId} (cog: ${cog}) is part of the whitelist.`);

  const revisionFileText = await getRevisionFileText(revisionId);

  // Convert csv to json
  const bal = csvBalToJsonBal(revisionFileText);

  // Detect BAL version
  const version = getBalVersion(bal);
  logger.info(`District id ${districtId} (cog: ${cog}) is using BAL version ${version}`);

  // Check if bal is using BanID
  // If not, send process to ban-plateforme legacy API
  // If the use of IDs is partial, throwing an error
  let useBanId = false;
  try {
    useBanId = await checkIfBALUseBanId(bal, version);
  } catch (error) {
    const { message: validatorErrorMessage } = error as Error;
    const message = `Not Processed : ${validatorErrorMessage}`;
    const processingReport = buildPreProcessingReport(1, message, {}, {revision, cog});
    await sendProcessingReport(districtId, processingReport);
    throw new Error(message);
  }
  
  if (!useBanId) {
    const message = `Redirected to legacy : District id ${districtId} (cog: ${cog}) does not use BanID.`;
    logger.info(message);

    const processingReport = buildPreProcessingReport(0, message, {}, {targetedPlateform: "legacy", revision, cog});
    await sendProcessingReport(districtId, processingReport);

    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  } else {
    logger.info(`District id ${districtId} (cog: ${cog}) is using banID`);
    // Update District with revision data

    // Update District meta with revision data from dump-api (id and date)
    const districtUpdate = {
      id: districtId,
      meta: {
        bal: {
          idRevision: revisionId,
          dateRevision: revisionPublishedAt,
        },
      },
    };
    await partialUpdateDistricts([districtUpdate]);

    const processingResult = (await sendBalToBan(bal)) || {};

    // No changes detected
    if (!Object.keys(processingResult).length) {
      const message = `No change detected : District id ${districtId} (cog: ${cog}) is already up to date.`;
      logger.info(message);

      const processingReport = buildPreProcessingReport(0, message, {}, {targetedPlateform: "ban", revision, cog});
      await sendProcessingReport(districtId, processingReport);

      return message;
    }

    const message = `Pre-processed : District id ${districtId} (cog: ${cog}) pre-processed and sent to BAN APIs.`;
    logger.info(`${message} - ${JSON.stringify(processingResult)}`);

    const processingReport = buildPreProcessingReport(0, message, processingResult, {targetedPlateform: "ban", revision, cog});
    await sendProcessingReport(districtId, processingReport);

    return processingResult;
  }
};
