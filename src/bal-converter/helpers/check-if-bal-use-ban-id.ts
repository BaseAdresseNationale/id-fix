import { Bal, BalVersion } from "../../types/bal-types.js";
import { digestIDsFromBalAddr } from "./index.js";

const checkIfBALUseBanId = (bal: Bal, version?: BalVersion) => {
  let useBanId = true;
  for (const balAdresse of bal) {
    const { mainTopoID } = digestIDsFromBalAddr(balAdresse, version);
    if (!mainTopoID) {
      useBanId = false;
      break;
    }
  }
  return useBanId;
};

export default checkIfBALUseBanId;
