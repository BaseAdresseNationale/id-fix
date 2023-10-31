import type { BanID, BanCommonTopoID } from "../types/ban-generic-types.js";

import {
  getAddressIdsReport,
  createAddresses,
  updateAddresses,
  deleteAddresses,
  getCommonToponymIdsReport,
  createCommonToponyms,
  updateCommonToponyms,
  deleteCommonToponyms,
} from "../ban-api/index.js";
import { balToBan, csvBalToJsonBal } from "./helpers/index.js";

const CHUNK_SIZE = 1000;
const DATA_TYPE = ["addresses", "commonToponyms"];
const ACTION_TYPE = ["add", "update", "delete"];

export const sendBalToBan = async (bal: string) => {
  const balJSON = csvBalToJsonBal(bal);
  const { districtID, addresses, commonToponyms } = balToBan(balJSON);

  // Get addresses and toponyms reports
  const banAddressIds: BanID[] = Object.keys(addresses || {});
  const banToponymIds: BanCommonTopoID[] = Object.keys(commonToponyms || {});
  const [addressIdsReport, toponymsIdsReport] = await Promise.all([
    getAddressIdsReport(districtID, banAddressIds),
    getCommonToponymIdsReport(districtID, banToponymIds),
  ]);

  // Sort Addresses (Add/Update/Delete)
  const banAddressesToAdd = []
  for (const addressId of addressIdsReport.idsToCreate) {
    banAddressesToAdd.push(addresses[addressId])
  }
  const banAddressesToUpdate = []
  for (const addressId of addressIdsReport.idsToUpdate) {
    banAddressesToUpdate.push(addresses[addressId])
  }
  const banAddressesIdsToDelete = addressIdsReport.idsToDelete;

  // Split arrays in chunks of 1000 elements
  const banAddressesToAddChunks = [];
  const banAddressesToUpdateChunks = [];
  const banAddressesIdsToDeleteChunks = [];

  for (let i = 0; i < banAddressesToAdd.length; i += CHUNK_SIZE) {
    banAddressesToAddChunks.push(
      banAddressesToAdd.slice(i, i + CHUNK_SIZE),
    );
  }
  for (let i = 0; i < banAddressesToUpdate.length; i += CHUNK_SIZE) {
    banAddressesToUpdateChunks.push(
      banAddressesToUpdate.slice(i, i + CHUNK_SIZE),
    );
  }
  for (let i = 0; i < banAddressesIdsToDelete.length; i += CHUNK_SIZE) {
    banAddressesIdsToDeleteChunks.push(
      banAddressesIdsToDelete.slice(i, i + CHUNK_SIZE),
    );
  }
  
  // Sort Toponyms (Add/Update/Delete)
  const banToponymsToAdd = []
  for (const toponymId of toponymsIdsReport.idsToCreate) {
    banToponymsToAdd.push(commonToponyms[toponymId])
  }
  const banToponymsToUpdate = []
  for (const toponymId of toponymsIdsReport.idsToUpdate) {
    banToponymsToUpdate.push(commonToponyms[toponymId])
  }
  const banToponymsIdsToDelete = toponymsIdsReport.idsToDelete;

  // Split arrays in chunks of 1000 elements
  const banToponymsToAddChunks = [];
  const banToponymsToUpdateChunks = [];
  const banToponymsIdsToDeleteChunks = [];

  for (let i = 0; i < banToponymsToAdd.length; i += CHUNK_SIZE) {
    banToponymsToAddChunks.push(
      banToponymsToAdd.slice(i, i + CHUNK_SIZE),
    );
  }

  for (let i = 0; i < banToponymsToUpdate.length; i += CHUNK_SIZE) {
    banToponymsToUpdateChunks.push(
      banToponymsToUpdate.slice(i, i + CHUNK_SIZE),
    );
  }

  for (let i = 0; i < banToponymsIdsToDelete.length; i += CHUNK_SIZE) {
    banToponymsIdsToDeleteChunks.push(
      banToponymsIdsToDelete.slice(i, i + CHUNK_SIZE),
    );
  }

  // Order is important here. Need to handle common toponyms first, then adresses
  // Common toponyms
  const responseCommonToponymsToAdd = await Promise.all(banToponymsToAddChunks.map((chunk) => createCommonToponyms(chunk)))
  const responseCommonToponymsToUpdate =  await Promise.all(banToponymsToUpdateChunks.map((chunk) => updateCommonToponyms(chunk)))

  const responseCommonToponyms = [
    responseCommonToponymsToAdd,
    responseCommonToponymsToUpdate,
  ]

  // Addresses
  const responseAddressesToAdd = await Promise.all(banAddressesToAddChunks.map((chunk) => createAddresses(chunk)))
  const responseAddressesToUpdate = await Promise.all(banAddressesToUpdateChunks.map((chunk) => updateAddresses(chunk)))
  const responseAddressesToDelete = await Promise.all(banAddressesIdsToDeleteChunks.map((chunk) => deleteAddresses(chunk)))

  const responseAddresses = [
    responseAddressesToAdd,
    responseAddressesToUpdate,
    responseAddressesToDelete,
  ]

  // To delete common toponyms, we need to wait for addresses to be deleted first
  const responseCommonToponymsToDelete = await Promise.all(banToponymsIdsToDeleteChunks.map((chunk) => deleteCommonToponyms(chunk)))

  responseCommonToponyms.push(responseCommonToponymsToDelete)

  const allReponses = [responseAddresses, responseCommonToponyms]
  const formatedResponse = {} as any
  allReponses.forEach((responseType: any[], indexDataType: number) => {
    if (responseType.length > 0) {
      responseType.forEach((responseAction: any[], indexActionType: number) => {
        if (responseAction.length > 0) {
          formatedResponse[DATA_TYPE[indexDataType]] = {
            ...formatedResponse[DATA_TYPE[indexDataType]],
            [ACTION_TYPE[indexActionType]]: responseAction
          }
        }
      })
    }
  })
  return formatedResponse
}
