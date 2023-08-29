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
  const banToponyms: BanCommonToponyms = Object.values(commonToponyms || {});
  const banToponymsToAdd = banToponyms.filter(({ id }) =>
    toponymsIdsReport.idsToCreate.includes(id)
  );
  const banToponymsToUpdate = banToponyms.filter(({ id }) =>
    toponymsIdsReport.idsToUpdate.includes(id)
  );
  const banToponymsIdsToDelete = toponymsIdsReport.idsToDelete;

  // Sort Addresses (Add/Update/Delete)
  const banAddresses: BanAddresses = Object.values(addresses || {});
  const banAddressesToAdd = banAddresses.filter(({ id }) =>
    addressIdsReport.idsToCreate.includes(id)
  );
  const banAddressesToUpdate = banAddresses.filter(({ id }) =>
    addressIdsReport.idsToUpdate.includes(id)
  );
  const banAddressesIdsToDelete = addressIdsReport.idsToDelete;

  // Order is important here. Need to handle common toponyms first, then adresses
  const responseCommonToponyms = await Promise.all([
    banToponymsToAdd.length > 0 && createCommonToponyms(banToponymsToAdd),
    banToponymsToUpdate.length > 0 && updateCommonToponyms(banToponymsToUpdate),
    banToponymsIdsToDelete.length > 0 &&
      deleteCommonToponyms(banToponymsIdsToDelete),
  ]);

  const responseAddresses = await Promise.all([
    banAddressesToAdd.length > 0 && createAddresses(banAddressesToAdd),
    banAddressesToUpdate.length > 0 && updateAddresses(banAddressesToUpdate),
    banAddressesIdsToDelete.length > 0 &&
      deleteAddresses(banAddressesIdsToDelete),
  ]);

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
