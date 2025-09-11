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
import asyncSendMessageToWebHook from './utils/send-message-to-hook.js';
import { MessageCatalog, DistrictInfoBuilder } from './utils/status-catalog.js';

async function sendWebhook(messageFunc: Function, revision: any, cog: string, districtName?: string | null, districtId?: string | null) {
  const message = messageFunc();
  const status = message.startsWith('✅') ? 'success' 
    : message.startsWith('ℹ️') ? 'info'
    : message.startsWith('⚠️') ? 'warning' : 'error';
  
  await asyncSendMessageToWebHook(message, revision?.id, cog, districtName, districtId, status);
}

async function checkSingleJob(statusID: string, maxWaitMinutes: number = 100): Promise<void> {
  const maxAttempts = maxWaitMinutes * 12;
  const BAN_API_URL = process.env.BAN_API_URL || '';
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BAN_API_URL}/job-status/${statusID}`);
      const jobData = await response.json();
      
      if (jobData.response?.status === 'pending' || jobData.response?.status === 'processing') {
        logger.info(MessageCatalog.INFO.JOB_PENDING.template(statusID, attempt, maxAttempts));
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      if (jobData.response?.status === 'error') {
        let errorMessage = jobData.response?.message || 'Unknown error';
        
        if (jobData.response?.report?.data && jobData.response.report.data.length > 0) {
          const firstError = jobData.response.report.data[0];
          if (firstError?.report?.data && firstError.report.data.length > 0) {
            const firstDetailError = firstError.report.data[0];
            errorMessage = `${errorMessage} - ${firstDetailError}`;
          }
        }
        
        throw new Error(MessageCatalog.ERROR.JOB_FAILED.template(statusID, errorMessage));
      }
      
      if (jobData.response?.status === 'success') {
        logger.info(MessageCatalog.SUCCESS.JOB_COMPLETED.template(statusID, attempt * 5));
        return;
      }
      
      throw new Error(MessageCatalog.ERROR.JOB_UNKNOWN_STATUS.template(statusID, jobData.response?.status));
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(MessageCatalog.ERROR.JOB_TIMEOUT.template(statusID, maxWaitMinutes));
      }
      if (error instanceof Error && error.message.includes('Job') && (error.message.includes('failed') || error.message.includes('échoué'))) {
        throw error;
      }
    }
  }
  
  throw new Error(MessageCatalog.ERROR.JOB_TIMEOUT.template(statusID, maxWaitMinutes));
}

async function checkAllJobs(responseData: any, id: string): Promise<void> {
  const statusIDs: string[] = [];
  
  if (responseData.addresses?.add) {
    responseData.addresses.add.forEach((item: any) => {
      if (item.response?.statusID) {
        statusIDs.push(item.response.statusID);
      }
    });
  }
  
  if (responseData.commonToponyms?.add) {
    responseData.commonToponyms.add.forEach((item: any) => {
      if (item.response?.statusID) {
        statusIDs.push(item.response.statusID);
      }
    });
  }
  
  if (statusIDs.length === 0) {
    return;
  }
  
  logger.info(MessageCatalog.INFO.CHECKING_JOBS.template(statusIDs.length, id));
  
  await Promise.all(statusIDs.map(statusID => checkSingleJob(statusID)));
  
  logger.info(MessageCatalog.SUCCESS.ALL_JOBS_COMPLETED.template(statusIDs.length, id));
}

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
      
      await sendWebhook(() => message, revision, cog, districtName, districtId);
      
      await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
      throw new Error(message);
    } else {
      const districtInfo = DistrictInfoBuilder.fromDistricts(districtsOnNewDB);
      const message = MessageCatalog.ERROR.BAL_BLOCKED.template(cog, districtInfo, errorMessage);
      logger.error(message);
      
      await sendWebhook(() => message, revision, cog, districtName, districtId);
      
      throw new Error(message);
    }
  }

  if (!useBanId) {
    const message = MessageCatalog.INFO.NO_BAN_ID.template(cog);
    logger.info(message);
    
    await sendWebhook(() => message, revision, cog);
    
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
          
          await sendWebhook(() => message, revision, cog, districtName, id);
          
          results.push(message);
        } else {
          const responseBody = JSON.stringify(result.data);
          logger.info(MessageCatalog.INFO.DISTRICT_UPDATED.template(id, cog, responseBody));
          
          await checkAllJobs(result.data, id);
          results.push(result.data);
        }

        await partialUpdateDistricts([districtUpdate]);
        
        const message = MessageCatalog.SUCCESS.DISTRICT_PROCESSED.template(id, cog);
        logger.info(message);

        await sendWebhook(() => message, revision, cog, districtName, id);

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
        
        await sendWebhook(() => message, revision, cog, districtName, id);
        await partialUpdateDistricts([districtUpdate]);
        throw new Error(message);
      }
    }
    return results;
  }
};