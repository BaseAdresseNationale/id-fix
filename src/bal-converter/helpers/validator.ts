import { Bal, BalVersion } from '../../types/bal-types';
import { digestIDsFromBalAddr } from './index.js';
import { numberForTopo as IS_TOPO_NB } from '../bal-converter.config.js';
import { MessageCatalog } from '../../utils/status-catalog.js';
const validator = async (
  districtIDsFromDB: string[],
  bal: Bal,
  version: BalVersion,
  { cog }: { cog: string }
) => {
  // BAL 1.5 : les IDs sont obligatoires (sauf pour les lieux-dits numero === 99999)
  if (version === '1.5') {
    const districtIDsExtracted: string[] = [];
    for (const balAdresse of bal) {
      const { districtID, mainTopoID, addressID } = digestIDsFromBalAddr(balAdresse, version);
      const isLieuDit = balAdresse.numero === Number(IS_TOPO_NB);

      // En BAL 1.5, id_ban_commune et id_ban_toponyme sont toujours obligatoires.
      // id_ban_adresse est obligatoire sauf pour les lieux-dits (numero === 99999).
      if (!districtID || !mainTopoID || (!isLieuDit && !addressID)) {
        throw new Error(MessageCatalog.ERROR.BAL_1_5_MISSING_IDS.template(cog, balAdresse));
      }

      if (!districtIDsExtracted.includes(districtID)) {
        districtIDsExtracted.push(districtID);
      }
    }
    if (!districtIDsExtracted.every((id) => districtIDsFromDB.includes(id))) {
      const unauthorized = districtIDsExtracted.filter((id) => !districtIDsFromDB.includes(id));
      throw new Error(MessageCatalog.ERROR.MISSING_RIGHTS.template(unauthorized));
    }
    return true;
  }

  let balAdresseUseBanId = 0
  let balAddressDoNotUseBanId = 0
  const districtIDsExtracted: string[] = [];

  for (const balAdresse of bal) {
    // Check presence and format of BanIDs
    const { districtID, mainTopoID, addressID } = digestIDsFromBalAddr(
      balAdresse,
      version
    );

    // If at least one of the IDs is present, it means that the BAL address is using BanID
    if (districtID || mainTopoID || addressID) {
      if (!districtID) {
        throw new Error(MessageCatalog.ERROR.MISSING_DISTRICT_ID.template(districtID || 'unknown', cog, balAdresse));
      }
      if (!mainTopoID) {
        throw new Error(MessageCatalog.ERROR.MISSING_MAIN_TOPO_ID.template(districtID, cog, balAdresse));
      }
      if (balAdresse.numero !== Number(IS_TOPO_NB) && !addressID) {
        throw new Error(MessageCatalog.ERROR.MISSING_ADDRESS_ID.template(districtID, cog, balAdresse));
      }
      
      balAdresseUseBanId++
      if (!districtIDsExtracted.includes(districtID)) {
        districtIDsExtracted.push(districtID);
      }
    } else {
      balAddressDoNotUseBanId++;
    }
  }

  if (balAdresseUseBanId === bal.length) {
    // Check district IDs consistency
    if (!districtIDsExtracted.every(districtIDExtracted => districtIDsFromDB.includes(districtIDExtracted))) {
      const unauthorizedDistrictIDs = districtIDsExtracted.filter(districtIDExtracted => !districtIDsFromDB.includes(districtIDExtracted));
      throw new Error(MessageCatalog.ERROR.MISSING_RIGHTS.template(unauthorizedDistrictIDs));
    }
    return true;
  } else if (balAddressDoNotUseBanId === bal.length) {
    return false;
  } else {
    throw new Error(MessageCatalog.ERROR.MIXED_ID_USAGE.template(cog));
  }
};

export default validator;
