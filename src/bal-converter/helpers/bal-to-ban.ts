import type { Bal, BalAdresse } from "../../types/bal-types.js";
import type { Ban } from "../../types/ban-types.js";

import balAddrToBanAddr from "./bal-addr-to-ban-addr.js";
import balTopoToBanTopo from "./bal-topo-to-ban-topo.js";
import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const balToBan = (bal: Bal): Ban => {
  const ban: Ban = {
    districtID: "",
    addresses: {},
    commonToponyms: {},
  };

  for (const balAdresse of bal) {
    const { addressID, mainTopoID, districtID } = digestIDsFromBalAddr(balAdresse);
    const banIdContent = balAddrToBanAddr(balAdresse, ban.addresses?.[addressID]);
    const banCommonTopoIdContent = balTopoToBanTopo(balAdresse, ban.commonToponyms?.[mainTopoID]);

    ban.districtID = districtID;

    if (banIdContent) {
      ban.addresses[addressID] = banIdContent;
    }
    
    if (banCommonTopoIdContent){
      ban.commonToponyms[mainTopoID] = banCommonTopoIdContent;
    }
  }

  return ban;
};

export default balToBan;
