import { Bal, BalVersion } from "../../types/bal-types.js";
import { logger } from "../../utils/logger.js";
import { digestIDsFromBalAddr } from "./index.js";
import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";

const checkIfBALUseBanId = (bal: Bal, version?: BalVersion) => {
  let balAdresseUseBanId = 0
  let balAddressDoNotUseBanId = 0
  for (const balAdresse of bal) {
    const { districtID, mainTopoID, addressID } = digestIDsFromBalAddr(
      balAdresse,
      version
    );

    // If at least one of the IDs is present, it means that the BAL address is using BanID
    if (districtID || mainTopoID || addressID) {
      if (!districtID){
        logger.info(`Missing districtID for bal address ${JSON.stringify(balAdresse)}`);
        throw new Error(`Missing districtID for bal address ${JSON.stringify(balAdresse)}`);
      }

      if (!mainTopoID){
        logger.info(`Missing mainTopoID for bal address ${JSON.stringify(balAdresse)}`);
        throw new Error(`Missing mainTopoID for bal address ${JSON.stringify(balAdresse)}`);
      }

      if (balAdresse.numero !== Number(IS_TOPO_NB) && !addressID){
        logger.info(`Missing addressID for bal address ${JSON.stringify(balAdresse)}`);
        throw new Error(`Missing addressID for bal address ${JSON.stringify(balAdresse)}`);
      }
      balAdresseUseBanId++
    } else {
      balAddressDoNotUseBanId++
    }
  }

  if (balAdresseUseBanId === bal.length){
    return true;
  } else if (balAddressDoNotUseBanId === bal.length){
    return false;
  } else {
    logger.info(`Some lines are using BanIDs and some are not`); 
    throw new Error(`Some lines are using BanIDs and some are not`);
  }
};

export default checkIfBALUseBanId;
