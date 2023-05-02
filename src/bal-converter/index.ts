import type {
  BanID,
  BanCommonTopoID,
  LangISO639v3,
} from "../types/ban-generic-types.js";

import type { Bal, BalAdresse, VoieNomIsoCodeKey } from "../types/bal-types.js";

import type {
  Ban,
  BanAddress,
  BanAddresses,
  BanCommonToponyms,
  BanCommonToponym,
} from "../types/ban-types.js";

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

import { csvToJson } from "./utils.js";

const getIds = (balAdresse: BalAdresse) => {
  const [banID, banCommonTopoID] = balAdresse.uid_adresse.split("/");
  return {
    banID,
    banCommonTopoID,
  };
};

const balAddrToBanAddr = (
  balAdresse: BalAdresse,
  oldBanAddress?: BanAddress
): BanAddress => {
  const { banID, banCommonTopoID } = getIds(balAdresse);
  return {
    ...(oldBanAddress || {}),
    id: banID,
    codeCommune: balAdresse.commune_insee,
    idVoie: banCommonTopoID,
    numero: balAdresse.numero,
    positions: [
      // Old positions
      ...(oldBanAddress?.positions || []),
      {
        type: balAdresse.position,
        geometry: {
          type: "Point",
          coordinates: [balAdresse.long, balAdresse.lat],
        },
      },
    ],
    dateMAJ: balAdresse.date_der_maj,
  };
};

const balTopoToBanTopo = (
  balAdresse: BalAdresse,
  oldBanCommonToponym?: BanCommonToponym
): BanCommonToponym => {
  const { banCommonTopoID } = getIds(balAdresse);
  const isoCodeFromBalNomVoie = (key: LangISO639v3) => key.trim().split("_")[2];
  const labels = {
    fr: balAdresse.voie_nom,
    ...Object.fromEntries(
      (
        Object.keys(balAdresse).filter((key) =>
          key.startsWith("voie_nom_")
        ) as VoieNomIsoCodeKey[]
      ).map((key) => [isoCodeFromBalNomVoie(key), balAdresse[key]])
    ),
  };

  return {
    ...(oldBanCommonToponym || {}),
    id: banCommonTopoID,
    codeCommune: balAdresse.commune_insee,
    label: Object.entries(labels).map(([isoCode, value]) => ({
      isoCode,
      value,
    })), // TODO: rename key to 'labels'
    type: { value: "voie" }, // TODO: How to get the type from the BAL?
    geometry: {
      type: "Point",
      coordinates: [balAdresse.long, balAdresse.lat],
    },
    dateMAJ: balAdresse.date_der_maj,
  };
};

const balToBan = (bal: Bal): Ban => {
  const ban = bal.reduce(
    (acc: Ban, balAdresse: BalAdresse) => {
      const { banID, banCommonTopoID } = getIds(balAdresse);
      const banIdContent = balAddrToBanAddr(balAdresse, acc.addresses?.[banID]);
      const banCommonTopoIdContent = balTopoToBanTopo(
        balAdresse,
        acc.commonToponyms?.[banCommonTopoID]
      );
      const districtID = banIdContent.codeCommune;
      return {
        ...acc,
        districtID,
        addresses: {
          ...acc.addresses,
          [banID]: banIdContent,
        },
        commonToponyms: {
          ...acc.commonToponyms,
          [banCommonTopoID]: banCommonTopoIdContent,
        },
      };
    },
    {
      districtID: "",
      addresses: {},
      commonToponyms: {},
    }
  );

  return ban;
};

export const sendBalToBan = async (bal: string) => {
  const balJSON = csvToJson(bal) as Bal;
  const { districtID, addresses, commonToponyms } = balToBan(balJSON);

  const banAddressIds: BanID[] = Object.keys(addresses || {});
  const banToponymIds: BanCommonTopoID[] = Object.keys(commonToponyms || {});
  const [addressIdsReport, toponymsIdsReport] = await Promise.all([
    getAddressIdsReport(districtID, banAddressIds),
    getCommonToponymIdsReport(districtID, banToponymIds),
  ]);

  // Sort Addresses (Add/Update/Delete)
  const banAddresses: BanAddresses = Object.values(addresses || {});
  const banAddressesToAdd = banAddresses.filter(({ id }) =>
    addressIdsReport.idsToCreate.includes(id)
  );
  const banAddressesToUpdate = banAddresses.filter(({ id }) =>
    addressIdsReport.idsToUpdate.includes(id)
  );
  const banAddressesIdsToDelete = banAddressIds.filter((id) =>
    addressIdsReport.idsToDelete.includes(id)
  );

  // Sort Toponyms (Add/Update/Delete)
  const banToponyms: BanCommonToponyms = Object.values(commonToponyms || {});
  const banToponymsToAdd = banToponyms.filter(({ id }) =>
    toponymsIdsReport.idsToCreate.includes(id)
  );
  const banToponymsToUpdate = banToponyms.filter(({ id }) =>
    toponymsIdsReport.idsToUpdate.includes(id)
  );
  const banToponymsIdsToDelete = banToponymIds.filter((id) =>
    toponymsIdsReport.idsToDelete.includes(id)
  );

  const dataType = ["addresses", "commonToponyms"];
  const actionType = ["add", "update", "delete"];

  const responses = await Promise.all([
    // Bulk Actions to BAN?
    banAddressesToAdd.length > 0 && createAddresses(banAddressesToAdd),
    banAddressesToUpdate.length > 0 && updateAddresses(banAddressesToUpdate),
    banAddressesIdsToDelete.length > 0 &&
      deleteAddresses(banAddressesIdsToDelete),
    banToponymsToAdd.length > 0 && createCommonToponyms(banToponymsToAdd),
    banToponymsToUpdate.length > 0 && updateCommonToponyms(banToponymsToUpdate),
    banToponymsIdsToDelete.length > 0 &&
      deleteCommonToponyms(banToponymsIdsToDelete),
  ]);

  return responses.reduce((acc, cur, i) => {
    const keyDataType = Math.floor(i / 3);
    const keyActionType = i % 3;
    return {
      ...acc,
      [dataType[keyDataType]]: {
        ...(acc[dataType[keyDataType]] || {}),
        [actionType[keyActionType]]: cur,
      },
    };
  }, {});
};
