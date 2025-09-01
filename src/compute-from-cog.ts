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

async function checkSingleJob(statusID: string, maxWaitMinutes: number = 100): Promise<void> {
  const maxAttempts = maxWaitMinutes * 12; // 12 tentatives par minute (toutes les 5 sec)
  const BAN_API_URL = process.env.BAN_API_URL || '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BAN_API_URL}/job-status/${statusID}`);
      const jobData = await response.json();
      
      if (jobData.response?.status === 'pending' || jobData.response?.status === 'processing') {
        logger.info(`Job ${statusID} pending... (attempt ${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 secondes
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
        logger.info(`Job ${statusID} completed successfully after ${attempt * 5}s`);
        return; // OK
      }
      
      // Status inconnu
      throw new Error(`Job ${statusID} unknown status: ${jobData.response?.status}`);
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Job ${statusID} timeout after ${maxWaitMinutes} minutes`);
      }
      // Continuer si ce n'est pas la dernière tentative et que c'est une erreur réseau
      if (error instanceof Error && error.message.includes('Job') && error.message.includes('failed')) {
        throw error; // Remonter immédiatement les erreurs de job
      }
    }
  }
  
  // Timeout après toutes les tentatives
  throw new Error(`Job ${statusID} timeout after ${maxWaitMinutes} minutes`);
}


// Fonction parallèle qui échoue dès qu'un job échoue
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
  
  logger.info(`Checking ${statusIDs.length} job(s) for district ${id} in parallel...`);
  
  // Promise.all échoue dès qu'une promise échoue
  await Promise.all(statusIDs.map(statusID => checkSingleJob(statusID)));
  
  logger.info(`All ${statusIDs.length} jobs completed successfully for district ${id}`);
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
      const districtName = districtsOnNewDB[0]?.labels[0].value || districts[0]?.labels[0].value || null ;
      const districtId = districtsOnNewDB[0]?.id || districts[0]?.id || null;
    if (!districtsOnNewDB.length) {
    
      const warningMessage = ["⚠️ sending BAL to legacy compose...", ...errorMessage].join("\n");
      logger.error(warningMessage)
      
      // Webhook avec statut WARNING pour legacy compose avec erreur
      await asyncSendMessageToWebHook(`Warning computing cog \`${cog}\` :\n ${warningMessage}`, revision.id, cog, districtName, districtId, 'warning');
      
      await sendBalToLegacyCompose(cog, forceLegacyCompose as string);
      throw new Error(warningMessage)
    } else {
      
      const warningMessage = [
        `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
        `⛔️ BAL ${cog} blocked - District(s) already in new DB`,
        ...errorMessage
      ].join("\n")

      logger.error(warningMessage)
      
      // Webhook avec statut WARNING pour BAL bloqué
      await asyncSendMessageToWebHook(`Error computing cog \`${cog}\` :\n ${warningMessage}`, revision.id, cog, districtName, districtId, 'error');
      
      throw new Error(warningMessage)
    }
  }

  if (!useBanId) {
    const infoMessage = `District cog: ${cog} does not use BanID: sending BAL to legacy compose...`;
    logger.info(infoMessage);
    
    // Webhook avec statut INFO pour legacy compose sans erreur
    await asyncSendMessageToWebHook(`ℹ️ Info computing cog \`${cog}\` :\n ${infoMessage}`, revision.id, cog, null, null, 'info');
    
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
      const district = districts.find(d => d.id === id);
      const districtName = district?.labels[0].value || null;
      
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
          
          // Webhook avec statut INFO pour pas de changements
          await asyncSendMessageToWebHook(`ℹ️ Info computing cog \`${cog}\` :\n ${response}`, revision.id, cog, districtName, id, 'info');
          
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

        // Webhook avec statut SUCCESS pour traitement réussi
        await asyncSendMessageToWebHook(`Success computing cog \`${cog}\` :\n ${successMessage}`, revision.id, cog, districtName, id, 'success');

      } catch (error) {
        const { message } = error as Error;
        const districtsOnNewDB = districts.filter((district) => district.meta?.bal?.idRevision);
        logger.error(message);
        results.push(`Error for district ${id} (cog: ${cog}) : ${message}`);
        
        let warningMessage = [
          `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
          `⛔️ BAL ${cog} blocked`, message
        ].join("\n")
            
        if (message.includes('Deletion threshold exceeded')) {
          warningMessage = [
            `${districtsOnNewDB.map(({ id, labels, meta }) => `${labels[0].value} (${meta?.insee.cog} / ${id})`).join(", ")}`,
            `⚠️ ** BAL ${cog} will be blocked soon -- Unexplained ID changes detected **`, message
          ].join("\n")
        }
        
        await partialUpdateDistricts([districtUpdate]);
        
        // Webhook avec statut ERROR ou WARNING selon le type d'erreur
        const errorStatus = message.includes('Deletion threshold exceeded') ? 'warning' : 'error';
        await asyncSendMessageToWebHook(`Error computing cog \`${cog}\` :\n ${warningMessage}`, revision.id, cog, districtName, id, errorStatus);
        
        throw new Error(warningMessage)
      }
    }
    return results;
  }
};