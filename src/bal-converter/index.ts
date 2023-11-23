import type { Bal } from "../types/bal-types.js";
import type {
  BanAddressID,
  BanCommonTopoID,
} from "../types/ban-generic-types.js";
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
import { balToBan } from "./helpers/index.js";
import { formatToChunks, formatResponse } from "./helpers/format.js";

const CHUNK_SIZE = 1000;

export const sendBalToBan = async (bal: Bal) => {
  const { districtID, addresses, commonToponyms } = balToBan(bal);

  // Get addresses and toponyms reports
  const banAddressIds: BanAddressID[] = Object.keys(addresses || {});
  const banToponymIds: BanCommonTopoID[] = Object.keys(commonToponyms || {});
  const [addressIdsReport, toponymsIdsReport] = await Promise.all([
    getAddressIdsReport(districtID, banAddressIds),
    getCommonToponymIdsReport(districtID, banToponymIds),
  ]);

  // Sort Addresses (Add/Update/Delete)
  const banAddressesToAdd = [];
  for (const addressId of addressIdsReport.idsToCreate) {
    banAddressesToAdd.push(addresses[addressId]);
  }
  const banAddressesToUpdate = [];
  for (const addressId of addressIdsReport.idsToUpdate) {
    banAddressesToUpdate.push(addresses[addressId]);
  }
  const banAddressesIdsToDelete = addressIdsReport.idsToDelete;

  // Split address arrays in chunks
  const banAddressesToAddChunks = formatToChunks(banAddressesToAdd, CHUNK_SIZE);
  const banAddressesToUpdateChunks = formatToChunks(
    banAddressesToUpdate,
    CHUNK_SIZE
  );
  const banAddressesIdsToDeleteChunks = formatToChunks(
    banAddressesIdsToDelete,
    CHUNK_SIZE
  );

  // Sort Toponyms (Add/Update/Delete)
  const banToponymsToAdd = [];
  for (const toponymId of toponymsIdsReport.idsToCreate) {
    banToponymsToAdd.push(commonToponyms[toponymId]);
  }
  const banToponymsToUpdate = [];
  for (const toponymId of toponymsIdsReport.idsToUpdate) {
    banToponymsToUpdate.push(commonToponyms[toponymId]);
  }
  const banToponymsIdsToDelete = toponymsIdsReport.idsToDelete;

  // Split common toponyms arrays in chunks
  const banToponymsToAddChunks = formatToChunks(banToponymsToAdd, CHUNK_SIZE);
  const banToponymsToUpdateChunks = formatToChunks(
    banToponymsToUpdate,
    CHUNK_SIZE
  );
  const banToponymsIdsToDeleteChunks = formatToChunks(
    banToponymsIdsToDelete,
    CHUNK_SIZE
  );

  // Order is important here. Need to handle common toponyms first (except delete), then adresses
  // Common toponyms
  const responseCommonToponymsToAdd = await Promise.all(
    banToponymsToAddChunks.map((chunk) => createCommonToponyms(chunk))
  );
  const responseCommonToponymsToUpdate = await Promise.all(
    banToponymsToUpdateChunks.map((chunk) => updateCommonToponyms(chunk))
  );

  const responseCommonToponyms = [
    responseCommonToponymsToAdd,
    responseCommonToponymsToUpdate,
  ];

  // Addresses
  const responseAddressesToAdd = await Promise.all(
    banAddressesToAddChunks.map((chunk) => createAddresses(chunk))
  );
  const responseAddressesToUpdate = await Promise.all(
    banAddressesToUpdateChunks.map((chunk) => updateAddresses(chunk))
  );
  const responseAddressesToDelete = await Promise.all(
    banAddressesIdsToDeleteChunks.map((chunk) => deleteAddresses(chunk))
  );

  const responseAddresses = [
    responseAddressesToAdd,
    responseAddressesToUpdate,
    responseAddressesToDelete,
  ];

  // To delete common toponyms, we need to wait for addresses to be deleted first
  const responseCommonToponymsToDelete = await Promise.all(
    banToponymsIdsToDeleteChunks.map((chunk) => deleteCommonToponyms(chunk))
  );
  responseCommonToponyms.push(responseCommonToponymsToDelete);

  // Format response
  const allReponses = [responseAddresses, responseCommonToponyms];
  return formatResponse(allReponses);
};
