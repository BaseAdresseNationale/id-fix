import { Bal, BalVersion } from '../../types/bal-types';
import { digestIDsFromBalAddr } from './index.js';
import { numberForTopo as IS_TOPO_NB } from '../bal-converter.config.js';

const validator = async (districtIDsFromDB: string[], bal: Bal, version: BalVersion, {cog}: {cog: string}) => {
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
        throw new Error(
          `Missing districtID - BAL from district ID : \`${districtID}\` (cog : \`${cog}\`) - BAL address line detail : \`${JSON.stringify(balAdresse)}\``
        );
      }

      if (!mainTopoID) {
        throw new Error(
          `Missing mainTopoID - BAL from district ID : \`${districtID}\` (cog : \`${cog}\`) - BAL address line detail : \`${JSON.stringify(balAdresse)}\``
        );
      }

      if (balAdresse.numero !== Number(IS_TOPO_NB) && !addressID) {
        throw new Error(
          `Missing addressID - BAL from district ID : \`${districtID}\` (cog : \`${cog}\`) - BAL address line detail : \`${JSON.stringify(balAdresse)}\``
        );
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
      throw new Error(`Missing rights - districtIDs ${unauthorizedDistrictIDs} are not part of the authorized districts to be updated`);
    }
    return true;
  } else if (balAddressDoNotUseBanId === bal.length) {
    return false;
  } else {
    throw new Error(`Missing IDs - BAL from cog : \`${cog}\` - Some BAL address lines are using BanIDs and some are not`);
  }
};

export default validator;
