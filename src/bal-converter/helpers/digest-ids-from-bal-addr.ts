import type { BalAdresse } from "../../types/bal-types.js";

import digestIDsFromBalUIDs from "./digest-ids-from-bal-uids.js";

const digestIDsFromBalAddr = (balAdresse: BalAdresse) => {
  const { uid_adresse: ids } = balAdresse;
  return digestIDsFromBalUIDs(ids);
};

export default digestIDsFromBalAddr;
