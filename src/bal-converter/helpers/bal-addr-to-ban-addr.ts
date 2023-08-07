import type { BalAdresse } from "../../types/bal-types.js";
import type { BanAddress } from "../../types/ban-types.js";

import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";
import { convertBalPositionTypeToBanPositionType } from "./bal-position-type-to-ban-position-type.js";
import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const DEFAULT_BAN_ADDR_POSITION = "other";

const balAddrToBanAddr = (
  balAdresse: BalAdresse,
  oldBanAddress?: BanAddress
): BanAddress | undefined => {
  const { addressID, mainTopoID, secondaryTopoIDs, districtID } = digestIDsFromBalAddr(balAdresse);
  const addrNumber = balAdresse.numero || oldBanAddress?.number;
  const positionType = convertBalPositionTypeToBanPositionType(balAdresse.position);
  const meta = balAdresse.cad_parcelles && balAdresse.cad_parcelles.length > 0 
    ? { cadastre: { ids: balAdresse.cad_parcelles } } 
    : {}
  return addrNumber && addrNumber !== Number(IS_TOPO_NB)
    ? {
        ...(oldBanAddress || {}),
        id: addressID,
        districtID,
        mainCommonToponymID: mainTopoID,
        secondaryCommonToponymIDs: secondaryTopoIDs,
        number: addrNumber,
        suffix: balAdresse.suffixe,
        positions: [
          // Previous positions
          ...(oldBanAddress?.positions || []),
          {
            type: positionType || DEFAULT_BAN_ADDR_POSITION,
            geometry: {
              type: "Point",
              coordinates: [balAdresse.long, balAdresse.lat],
            },
          },
        ],
        certified: balAdresse.certification_commune,
        updateDate: balAdresse.date_der_maj,
        meta,
      }
    : undefined;
};

export default balAddrToBanAddr;
