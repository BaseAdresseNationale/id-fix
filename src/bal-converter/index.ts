import type { BanID, BanCommonTopoID } from "../types/ban-generic-types.js";
import type { BanAddresses, BanCommonToponyms } from "../types/ban-types.js";

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

  // Order is important here. Need to handle common toponyms first, then adresses
  const responseCommonToponymsPromises = ([
    banToponymsToAdd.length > 0 && createCommonToponyms(banToponymsToAdd),
    banToponymsToUpdate.length > 0 && updateCommonToponyms(banToponymsToUpdate),
  ]);

  const responseAddresses = await Promise.all([
    banAddressesToAdd.length > 0 && createAddresses(banAddressesToAdd),
    banAddressesToUpdate.length > 0 && updateAddresses(banAddressesToUpdate),
    banAddressesIdsToDelete.length > 0 &&
      deleteAddresses(banAddressesIdsToDelete),
  ]);

  // To delete common toponyms, we need to wait for addresses to be deleted first
  responseCommonToponymsPromises.push(banToponymsIdsToDelete.length > 0 &&
      deleteCommonToponyms(banToponymsIdsToDelete),
  )

  const responseCommonToponyms = await Promise.all(responseCommonToponymsPromises);

  const responses = [...responseAddresses, ...responseCommonToponyms];

  return responses.reduce((acc, cur, i) => {
    const keyDataType = Math.floor(i / 3);
    const keyActionType = i % 3;
    return {
      ...acc,
      [DATA_TYPE[keyDataType]]: {
        ...(acc[DATA_TYPE[keyDataType]] || {}),
        [ACTION_TYPE[keyActionType]]: cur,
      },
    };
  }, {});
};
