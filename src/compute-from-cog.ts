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

// Check un seul job
async function checkSingleJob(statusID: string): Promise<void> {
  const maxAttempts = 5;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:5000/api/job-status/${statusID}`);
      const jobData = await response.json();
      
      if (jobData.response?.status === 'pending' ||jobData.response?.status === 'processing' ) {
        logger.info(`Job ${statusID} pending... (attempt ${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec
        continue;
      }
      
      if (jobData.response?.status === 'error') {
        // Récupérer le message global et le premier détail
        let errorMessage = jobData.response?.message || 'Unknown error';
        
        if (jobData.response?.report?.data && jobData.response.report.data.length > 0) {
          const firstError = jobData.response.report.data[0];
          if (firstError?.report?.data && firstError.report.data.length > 0) {
            // Combiner le message global avec le premier détail
            const firstDetailError = firstError.report.data[0];
            errorMessage = `${errorMessage} - ${firstDetailError}`;
          }
        }
        
        throw new Error(`Job ${statusID} failed: ${errorMessage}`);
      }
      
      if (jobData.response?.status === 'success') {
        logger.info(`Job ${statusID} completed successfully`);
        return; // OK
      }
      
      // Status inconnu
      throw new Error(`Job ${statusID} unknown status: ${jobData.response?.status}`);
      
    } catch (error) {
      throw new Error(`Job ${statusID} check failed: ${(error as Error).message}`);
    }
  }
  
  // Timeout après 5 tentatives
  throw new Error(`Job ${statusID} timeout after ${maxAttempts} attempts`);
}

// Fonction très simple : check tous les jobs
async function checkAllJobs(responseData: any, id: string): Promise<void> {
  // Extraire les statusIDs
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
    return; // Pas de jobs = OK
  }
  
  logger.info(`Checking ${statusIDs.length} job(s) for district ${id}...`);
  
  // Check chaque job
  for (const statusID of statusIDs) {
    await checkSingleJob(statusID);
  }
  
  logger.info(`All jobs completed successfully for district ${id}`);
}


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
  const isCogAccepted = isDepAccepted || acceptedCogList.includes(cog);
  if (!isCogAccepted) {
    logger.info(
      `Dep or District cog ${cog} is not part of the whitelist: sending BAL to legacy compose...`
    );
    return await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
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

  // If not, sending process to ban-plateforme legacy API
  // If the use of IDs is partial, throwing an error
  // Check if bal is using BanID
  let useBanId = false;
  try {
    useBanId = await validator(districtIDsFromDB, bal, version, { cog });
  } catch (error: unknown) {
    // Check if district is already on the new DB :
    const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);

    const errorMessage = [
      (error instanceof Error) ? error.message : error,
    ] as string[];

    if (!districtsOnNewDB.length) {
      const warningMessage = ["⚠️ sending BAL to legacy compose...", ...errorMessage].join("\n");
      logger.error(warningMessage)
      await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
      throw new Error(warningMessage)
    } else {
      const warningMessage =[
        `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
        `⛔️ BAL ${cog} blocked - District(s) already in new DB`,
      ...errorMessage].join("\n")

      logger.warn(warningMessage)
      throw new Error(warningMessage)    }
  }

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
      try {
        const result = (await sendBalToBan(bal)) || {};
        // Check if there are errors and throw here
        if (result.hasErrors) {
          // Log errors before throwing
          result.errors.forEach(error => {
            logger.error(`${error.type}: ${error.message}`);
          });
          
          // Throw the error here (your choice of message)
          const errorMessages = result.errors.map(e => e.message).join('\n');
          throw new Error(errorMessages);
        }

        if (!Object.keys(result.data).length) {
          const response = `District id ${id} (cog: ${cog}) not updated in BAN BDD. No changes detected.`;
          logger.info(response);
          results.push(response);
        } else {
          logger.info(
            `District id ${id} (cog: ${cog}) updated in BAN BDD. Response body : ${JSON.stringify(
              result.data
            )}`
          );
          // CHECK DES JOBS ASYNCHRONES
          await checkAllJobs(result.data, id);
          results.push(result.data);
        }

        await partialUpdateDistricts([districtUpdate]);
        // Message de succès pour les révisions traitées avec succès
        const successMessage = `✅ District ${id} (cog: ${cog}) successfully processed and updated in BAN database`;
        logger.info(successMessage);

        // Envoyer le message de succès via votre système d'alertes
        await asyncSendMessageToWebHook(successMessage);

      } catch (error) {
        const { message } = error as Error;
        const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);
        logger.error(message);
        results.push(`Error for district ${id} (cog: ${cog}) : ${message}`);
        let warningMessage =[
          `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
          `⛔️ BAL ${cog} blocked`, message].join("\n")
            
        if (message.includes('Deletion threshold exceeded')){
        warningMessage =[
          `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
          `⚠️ ** BAL ${cog} will be blocked soon -- Unexplained ID changes detected **`, message].join("\n")
        }
        await partialUpdateDistricts([districtUpdate]);
        throw new Error(warningMessage)
        }
    }
    return results;
  }
};
