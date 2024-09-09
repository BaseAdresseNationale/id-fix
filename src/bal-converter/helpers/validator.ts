import { Bal, BalVersion } from "../../types/bal-types";
import { logger } from "../../utils/logger.js";
import { digestIDsFromBalAddr } from "./index.js";
import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";

const validator = async (districtID: string, bal: Bal, version: BalVersion) => {
  let balAdresseUseBanId = 0
  let balAddressDoNotUseBanId = 0
  const districtIDs = new Set();
  for (const balAdresse of bal) {
    // Check presence and format of BanIDs
    const { districtID, mainTopoID, addressID } = digestIDsFromBalAddr(
      balAdresse,
      version
    );

    // If at least one of the IDs is present, it means that the BAL address is using BanID
    if (districtID || mainTopoID || addressID) {
      if (!districtID){
        throw new Error(`Missing districtID - bal address ${JSON.stringify(balAdresse)}`);
      }

      if (!mainTopoID){
        throw new Error(`Missing mainTopoID - bal address ${JSON.stringify(balAdresse)}`);
      }

      if (balAdresse.numero !== Number(IS_TOPO_NB) && !addressID){
        throw new Error(`Missing addressID - bal address ${JSON.stringify(balAdresse)}`);
      }
      balAdresseUseBanId++
      districtIDs.add(districtID);
    } else {
      balAddressDoNotUseBanId++
    }
  }

  if (balAdresseUseBanId === bal.length){
    // Check district IDs consistency
    if (districtIDs.size > 1){
      throw new Error(`Multiple district IDs - ${JSON.stringify([...districtIDs])}`);
    }
    if (!districtIDs.has(districtID)){
      throw new Error(`Missing rights - District ID ${districtID} cannot be updated`);
    }
    return true;
  } else if (balAddressDoNotUseBanId === bal.length){
    return false;
  } else {
    logger.info(`Some lines are using BanIDs and some are not`); 
    throw new Error(`Some lines are using BanIDs and some are not`);
  }
}

export default validator;