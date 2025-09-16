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
import { sendWebhook } from './utils/send-message-to-hook.js';
import { MessageCatalog, DistrictInfoBuilder } from './utils/status-catalog.js';
import checkAllJobs  from './utils/check-status-jobs.js'


export const computeFromCog = async (
  cog: string,
  forceLegacyCompose: string
) => {
  // Build isDepAccepted
  let numDep = cog.substring(0, 2);
  if ((numDep === "97") || (numDep === "98")) {
    numDep = cog.substring(0, 3);
  }
  const isDepAccepted = acceptedDepList.includes(numDep);

  // Check if dep or cog is part of the accepted dep or cog list
  const isCogAccepted = isDepAccepted || acceptedCogList.includes(cog);
  if (!isCogAccepted) {
    logger.info(MessageCatalog.INFO.NOT_WHITELISTED.template(cog));
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  }

  logger.info(MessageCatalog.INFO.WHITELISTED.template(cog));

  // Get BAL text data from dump-api
  const { revision, balTextData: balCsvData } = await getRevisionData(cog);

  // Convert csv to json
  const bal = csvBalToJsonBal(balCsvData);

  // Detect BAL version
  const version = getBalVersion(bal);
  logger.info(MessageCatalog.INFO.BAL_VERSION.template(cog, version));

  const districts: BanDistrict[] = await getDistrictFromCOG(cog);
  if (!districts.length) {
    throw new Error(MessageCatalog.ERROR.NO_DISTRICT_FOUND.template(cog));
  }

  const districtIDsFromDB = districts.map((district) => district.id);

  // Check if bal is using BanID
  let useBanId = false;
  try {
    useBanId = await validator(districtIDsFromDB, bal, version, { cog });
  } catch (error: unknown) {
    const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    const districtName = districtsOnNewDB[0]?.labels[0].value || districts[0]?.labels[0].value || null;
    const districtId = districtsOnNewDB[0]?.id || districts[0]?.id || null;
    
    if (!districtsOnNewDB.length) {
      const message = MessageCatalog.WARNING.LEGACY_WITH_ERROR.template(cog, errorMessage);
      logger.error(message);
      
      await sendWebhook(() => message, revision, cog, districtName, districtId,MessageCatalog.WARNING.LEGACY_WITH_ERROR.status);
      
      await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
      throw new Error(message);
    } else {
      const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
      const message = MessageCatalog.ERROR.BAL_BLOCKED.template(cog, districtInfo, errorMessage);
      logger.error(message);
      
      await sendWebhook(() => message, revision, cog, districtName, districtId,MessageCatalog.ERROR.BAL_BLOCKED.status);
      
      throw new Error(message);
    }
  }

  if (!useBanId) {
    const message = MessageCatalog.INFO.NO_BAN_ID.template(cog);
    logger.info(message);
    
    await sendWebhook(() => message, revision, cog,MessageCatalog.INFO.NO_BAN_ID.status);
    
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

    logger.info(MessageCatalog.INFO.USES_BAN_ID.template(cog));
    const results = [];
    
    for (let i = 0; i < Object.keys(splitBalPerDistictID).length; i++) {
      const [id, bal] = Object.entries(splitBalPerDistictID)[i];
      const district = districts.find(d => d.id === id);
      const districtName = district?.labels[0].value || null;
      
      const districtUpdate = {
        id,
        meta: {
          bal: {
            idRevision: revision.id,
            dateRevision: revision.publishedAt,
          },
        },
      };
      
      try {
        const result = (await sendBalToBan(bal)) || {};
        
        if (result.hasErrors) {
          result.errors.forEach(error => {
            logger.error(`${error.type}: ${error.message}`);
          });
          
          const errorMessages = result.errors.map(e => e.message).join('\n');
          throw new Error(errorMessages);
        }

        if (!Object.keys(result.data).length) {
  
          const message = MessageCatalog.INFO.NO_CHANGES.template(id, cog);
          logger.info(message);
          
          await sendWebhook(() => message, revision, cog, districtName, id,MessageCatalog.INFO.NO_CHANGES.status);
          
          results.push(message);
        } else {
          const responseBody = JSON.stringify(result.data);
          console.log(responseBody)
          logger.info(MessageCatalog.INFO.DISTRICT_UPDATED.template(id, cog, responseBody));
          
          await checkAllJobs(result.data, id);
          results.push(result.data);
        }

        await partialUpdateDistricts([districtUpdate]);
  // NOUVEAU: Envoyer les statistiques via webhook avant le message de succès
  if (result.statistics && result.statistics.totalChanges >0) {
    const statisticsMessage = MessageCatalog.INFO.PROCESSING_STATISTICS.template(
      result.statistics.districtID, 
      result.statistics.addressStats, 
      result.statistics.toponymStats
    );
    
    await sendWebhook(
      () => statisticsMessage,
      revision,
      cog,
      districtName,
      id,
      MessageCatalog.INFO.PROCESSING_STATISTICS.status
    );
  }
  
        const message = MessageCatalog.SUCCESS.DISTRICT_PROCESSED.template(id, cog);
        logger.info(message);


        await sendWebhook(() => message, revision, cog, districtName, id,MessageCatalog.SUCCESS.DISTRICT_PROCESSED.status);

      } catch (error) {
        const errorMessage = (error as Error).message;
        const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);
        logger.error(errorMessage);
        results.push(MessageCatalog.ERROR.DISTRICT_ERROR.template(id, cog, errorMessage));
        
        let message;
        
        if (errorMessage.includes('Deletion threshold exceeded') || errorMessage.includes('Seuil de suppression dépassé')) {
          const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
          message = MessageCatalog.WARNING.DELETION_THRESHOLD_SOON.template(cog, districtInfo, errorMessage);
        } else {
          const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
          message = MessageCatalog.ERROR.BAL_BLOCKED.template(cog, districtInfo, errorMessage);
        }
        
        await sendWebhook(() => message, revision, cog, districtName, id,MessageCatalog.ERROR.BAL_BLOCKED.status);
        await partialUpdateDistricts([districtUpdate]);
        throw new Error(message);
      }
    }
    return results;
  }
};