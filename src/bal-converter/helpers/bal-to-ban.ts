import type { Bal, BalAdresse } from "../../types/bal-types.js";
import type { Ban } from "../../types/ban-types.js";

import balAddrToBanAddr from "./bal-addr-to-ban-addr.js";
import balTopoToBanTopo from "./bal-topo-to-ban-topo.js";
import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const balToBan = (bal: Bal): Ban => {
  const ban = bal.reduce(
    (acc: Ban, balAdresse: BalAdresse) => {
      const { addressID, mainTopoID, districtID } = digestIDsFromBalAddr(balAdresse);
      const banIdContent = balAddrToBanAddr(
        balAdresse,
        acc.addresses?.[addressID]
      );
      const banCommonTopoIdContent = balTopoToBanTopo(
        balAdresse,
        acc.commonToponyms?.[mainTopoID]
      );
      return {
        ...acc,
        districtID,
        addresses: {
          ...acc.addresses,
          ...(banIdContent && { [addressID]: banIdContent }),
        },
        commonToponyms: {
          ...acc.commonToponyms,
          [mainTopoID]: banCommonTopoIdContent,
        },
      };
    },
    {
      districtID: "",
      addresses: {},
      commonToponyms: {},
    }
  );

  return ban;
};

export default balToBan;
