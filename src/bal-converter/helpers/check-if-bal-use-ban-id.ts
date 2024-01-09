import { Bal, BalVersion } from "../../types/bal-types.js";
import { logger } from "../../utils/logger.js";
import { digestIDsFromBalAddr } from "./index.js";
import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";

const checkIfBALUseBanId = (bal: Bal, version?: BalVersion) => {
  let useBanId = true;
  for (const balAdresse of bal) {
    const { districtID, mainTopoID, addressID } = digestIDsFromBalAddr(
      balAdresse,
      version
    );
    if (!districtID || !mainTopoID) {
      useBanId = false;
      break;
    }
    // If bal adresse line has a number (different from TOPO_NB), we need addressID to be defined too
    if (balAdresse?.numero !== Number(IS_TOPO_NB) && !addressID) {
      logger.info(`Missing addressID for bal address ${JSON.stringify(balAdresse)}`);
      useBanId = false;
      break;
    }
  }
  return useBanId;
};

export default checkIfBALUseBanId;
