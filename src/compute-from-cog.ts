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
  forceLegacyCompose: string,
  force_seuil?: boolean
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

  const getDistrictInfos = (districts: BanDistrict[]) => {
    const districtsOnNewDB = districts.filter(d => d.meta?.bal?.idRevision);
    const districtName = districtsOnNewDB[0]?.labels[0].value || districts[0]?.labels[0].value || null;
    const districtId = districtsOnNewDB[0]?.id || districts[0]?.id || null;
    
    return { districtsOnNewDB, districtName, districtId };
  };



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
  const { districtsOnNewDB, districtName, districtId } = getDistrictInfos(districts);
  // Check if bal is using BanID
  let useBanId = false;
  try {
    useBanId = await validator(districtIDsFromDB, bal, version, { cog });
  } catch (error: unknown) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    
    if (!districtsOnNewDB.length) {
      const message = MessageCatalog.WARNING.LEGACY_WITH_ERROR.template(cog, errorMessage);
      logger.error(message);
      
      await sendWebhook(() => message, revision, cog, districtName, districtId, MessageCatalog.WARNING.LEGACY_WITH_ERROR.status);
      
      await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
      throw new Error(message);
    } else {
      const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
      const message = MessageCatalog.ERROR.BAL_BLOCKED.template(cog, districtInfo, errorMessage);
      logger.error(message);
      
      await sendWebhook(() => message, revision, cog, districtName, districtId, MessageCatalog.ERROR.BAL_BLOCKED.status);
      
      throw new Error(message);
    }
  }

if (!useBanId) {
  if (!districtsOnNewDB.length) {
    const message = MessageCatalog.INFO.NO_BAN_ID.template(cog);
    logger.info(message);
    
    await sendWebhook(() => message, revision, cog, districtName, districtId, MessageCatalog.INFO.NO_BAN_ID.status);
    
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
  } else {
    // District existe dans la nouvelle DB mais n'utilise pas de BAN ID -> bloquer
    const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
    const message = MessageCatalog.ERROR.BAL_NO_BAN_ID_DISTRICT_EXISTS.template(cog, districtInfo);
    logger.error(message);
    
    await sendWebhook(() => message, revision, cog, districtName, districtId, MessageCatalog.ERROR.BAL_NO_BAN_ID_DISTRICT_EXISTS.status);
    
    throw new Error(message);
  }
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
        const result = (await sendBalToBan(bal, force_seuil ?? false))  || {};
        
        // Gérer les erreurs avec distinction entre seuil et autres erreurs
        if (result.hasErrors) {
          const hasThresholdError = result.errors.some(error => 
            error.type === 'DELETION_THRESHOLD_EXCEEDED'
          );
          
          if (hasThresholdError) {
            // Traiter le seuil comme un warning mais continuer
            const thresholdError = result.errors.find(e => e.type === 'DELETION_THRESHOLD_EXCEEDED');
            if (thresholdError) {
              const districtInfo = DistrictInfoBuilder.fromDistricts(districts.filter(d => d.meta?.bal?.idRevision));
              const warningMessage = MessageCatalog.WARNING.DELETION_THRESHOLD_SOON.template(cog, districtInfo, thresholdError.message);
              
              await sendWebhook(() => warningMessage, revision, cog, districtName, id, MessageCatalog.WARNING.DELETION_THRESHOLD_SOON.status);
            }
            
            // Continuer le traitement normal malgré le warning
          }
          
          // Vérifier s'il y a d'autres erreurs vraiment bloquantes
          const otherErrors = result.errors.filter(error => error.type !== 'DELETION_THRESHOLD_EXCEEDED');
          if (otherErrors.length > 0) {
            otherErrors.forEach(error => {
              logger.error(`${error.type}: ${error.message}`);
            });
            
            const errorMessages = otherErrors.map(e => e.message).join('\n');
            throw new Error(errorMessages);
          }
        }

        if (!Object.keys(result.data).length) {
          const message = MessageCatalog.INFO.NO_CHANGES.template(id, cog);
          logger.info(message);
          
          await sendWebhook(() => message, revision, cog, districtName, id, MessageCatalog.INFO.NO_CHANGES.status);
          
          results.push(message);
        } else {
          const responseBody = JSON.stringify(result.data);
          logger.info(MessageCatalog.INFO.DISTRICT_UPDATED.template(id, cog, responseBody));
          
          await checkAllJobs(result.data, id);
          results.push(result.data);
        }

        await partialUpdateDistricts([districtUpdate]);
        
        // Envoyer les statistiques si disponibles
        if (result.statistics && result.statistics.totalChanges > 0) {
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
        await sendWebhook(() => message, revision, cog, districtName, id, MessageCatalog.SUCCESS.DISTRICT_PROCESSED.status);

      } catch (error) {
        const errorMessage = (error as Error).message;
        const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);
        logger.error(errorMessage);
        results.push(MessageCatalog.ERROR.DISTRICT_ERROR.template(id, cog, errorMessage));
        
        // Autres erreurs vraiment bloquantes
        const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
        const message = MessageCatalog.ERROR.BAL_BLOCKED.template(cog, districtInfo, errorMessage);
        await sendWebhook(() => message, revision, cog, districtName, id, MessageCatalog.ERROR.BAL_BLOCKED.status);
        
        throw new Error(message);
      }
    }
    return results;
  }
};