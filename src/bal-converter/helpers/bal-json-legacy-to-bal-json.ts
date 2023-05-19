import type { Bal, BalAdresse } from "../../types/bal-types.js";

import { v4 as uuidv4 } from "uuid";

import digestIDsFromBalUIDs from "./digest-ids-from-bal-uids.js";
import {
  idsIdentifierIndex,
  numberForTopo as IS_TOPO_NB,
} from "../bal-converter.config.js";

const balJSONlegacy2balJSON = (balCSVlegacy: Bal): Bal => {
  const idsAddrMapping = new Map<string, string>();
  const idMainTopoMapping = new Map<string, string>();

  return balCSVlegacy.map((balAdresseLegacy: BalAdresse) => {
    const {
      uid_adresse: uidAdresseLegacy,
      commune_insee: districtID,
      voie_nom: mainTopoName,
      numero: addrNumber,
      suffixe,
    } = balAdresseLegacy;

    const { addressID: rawAddressID, mainTopoID: rawMainTopoID } =
      digestIDsFromBalUIDs(uidAdresseLegacy || "");

    const mainTopoKey = `${mainTopoName}${districtID}`;
    if (!idMainTopoMapping.has(mainTopoKey))
      idMainTopoMapping.set(mainTopoKey, rawMainTopoID || uuidv4());

    const addrKey = `${addrNumber}${suffixe}${mainTopoKey}${districtID}`;
    if (!idsAddrMapping.has(addrKey))
      idsAddrMapping.set(addrKey, rawAddressID || uuidv4());

    const idAddr =
      addrNumber &&
      addrNumber !== Number(IS_TOPO_NB) &&
      idsAddrMapping.get(addrKey);
    const idVoie = idMainTopoMapping.get(mainTopoKey);

    const banID = idAddr && `  ${idsIdentifierIndex.addressID}${idAddr} `;
    const mainTopoID = idVoie && `${idsIdentifierIndex.mainTopoID}${idVoie} `;
    const formatedBanIDs =
      `${banID || ""}${mainTopoID || ""}`.trim() || undefined;

    return {
      ...balAdresseLegacy,
      uid_adresse: formatedBanIDs,
    };
  });
};

export default balJSONlegacy2balJSON;
