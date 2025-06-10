// Get revision from dump-api (api de dépôt)
import { logger } from "./utils/logger.js";
import { getRevisionData } from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
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

import acceptedCogList from "./accepted-cog-list.json" with { type: "json" };
import acceptedDepList from "./accepted-dep-list.json" with { type: "json" };
import { BalAdresse } from "./types/bal-types.js";
import { BanDistrict } from "./types/ban-types.js";

export const computeFromCog = async (
  cog: string,
  forceLegacyCompose: string
) => {
  // Temporary check

  // Build isDepAccepted
  let numDep = cog.substring(0, 2);
  if ((numDep === "97") || (numDep === "98")) {
    numDep = cog.substring(0, 3);
  }
  const isDepAccepted = acceptedDepList.includes(numDep);

  // Check if dep or cog is part of the accepted dep or cog list
  const isCogAccepted = acceptedCogList.includes(cog);

  if (!isDepAccepted) {
    if (!isCogAccepted) {
      logger.info(
        `Dep or District cog ${cog} is not part of the whitelist: sending BAL to legacy compose...`
      );
      return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
    }
  }

  logger.info(`District cog ${cog} is part of the whitelist.`);

  // Get BAL text data from dump-api
  const { revision, balTextData: balCsvData } = await getRevisionData(cog);

  // Convert csv to json
  const bal = csvBalToJsonBal(balCsvData);

  // Detect BAL version
  const version = getBalVersion(bal);
  logger.info(`District cog ${cog} is using BAL version ${version}`);

  const districts: BanDistrict[] = await getDistrictFromCOG(cog);
  if (!districts.length) {
    throw new Error(`No district found with cog ${cog}`);
  }

  const districtIDsFromDB = districts.map((district) => district.id);

  // Check if bal is using BanID
  // If not, sending process to ban-plateforme legacy API
  // If the use of IDs is partial, throwing an error
  const useBanId = await validator(districtIDsFromDB, bal, version, { cog });

  if (!useBanId) {
    logger.info(
      `District cog: ${cog} does not use BanID: sending BAL to legacy compose...`
    );
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  } else {
    // Split BAL by district ID to handle multiple districts in a BAL
    const splitBalPerDistictID = bal.reduce(
      (acc: { [key: string]: BalAdresse[] }, balAdresse) => {
        if (balAdresse.id_ban_commune) {
          if (!acc[balAdresse.id_ban_commune]) {
            acc[balAdresse.id_ban_commune] = [];
          }
          acc[balAdresse.id_ban_commune].push(balAdresse);
        }
        return acc;
      },
      {}
    );

    logger.info(`District cog: ${cog} is using banID`);

    const results = [];
    for (let i = 0; i < Object.keys(splitBalPerDistictID).length; i++) {
      const [id, bal] = Object.entries(splitBalPerDistictID)[i];
      try {
        // Update District meta with revision data from dump-api (id and date)
        const districtUpdate = {
          id,
          meta: {
            bal: {
              idRevision: revision.id,
              dateRevision: revision.publishedAt,
            },
          },
        };
        await partialUpdateDistricts([districtUpdate]);

        const result = (await sendBalToBan(bal)) || {};

        if (!Object.keys(result).length) {
          const response = `District id ${id} (cog: ${cog}) not updated in BAN BDD. No changes detected.`;
          logger.info(response);
          results.push(response);
        } else {
          logger.info(
            `District id ${id} (cog: ${cog}) updated in BAN BDD. Response body : ${JSON.stringify(
              result
            )}`
          );
          results.push(result);
        }
      } catch (error) {
        const { message } = error as Error;
        logger.error(message);
        results.push(`Error for district ${id} (cog: ${cog}) : ${message}`);
      }
    }
    return results;
  }
};
