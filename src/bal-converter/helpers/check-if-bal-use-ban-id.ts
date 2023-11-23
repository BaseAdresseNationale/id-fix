import { Bal, BalAdresse } from "../../types/bal-types.js";
import { digestIDsFromBalUIDs } from "./index.js";

const checkIfBALUseBanId = (bal: Bal, version = "1.3") => {
  let useBanId = true;
  bal.forEach((balAdresse: BalAdresse) => {
    const { uid_adresse: ids } = balAdresse;
    if (!ids) {
      useBanId = false;
      return;
    }

    if (version === "1.3") {
      // Check if mainTopoID is present as each line of the uid_adresse field of the format 1.3 contains a toponym
      const { mainTopoID } = digestIDsFromBalUIDs(ids);
      if (!mainTopoID) {
        useBanId = false;
      }
    }
  });
  return useBanId;
};

export default checkIfBALUseBanId;
