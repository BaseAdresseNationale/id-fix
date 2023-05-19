import type { BalAdresse } from "../../types/bal-types.js";
import type { BanAddress } from "../../types/ban-types.js";

import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";
import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const DEFAULT_ADDR_POSITION = "autre"; // TODO: Comply with the defined BAL Standard : https://aitf-sig-topo.github.io/voies-adresses/files/AITF_SIG_Topo_Format_Base_Adresse_Locale_v1.3.pdf

const balAddrToBanAddr = (
  balAdresse: BalAdresse,
  oldBanAddress?: BanAddress
): BanAddress | undefined => {
  const { addressID, mainTopoID } = digestIDsFromBalAddr(balAdresse);
  const addrNumber = balAdresse.numero || oldBanAddress?.number;
  return addrNumber && addrNumber !== Number(IS_TOPO_NB)
    ? {
        ...(oldBanAddress || {}),
        id: addressID,
        districtID: balAdresse.commune_insee,
        commonToponymID: mainTopoID,
        number: addrNumber,
        suffix: balAdresse.suffixe,
        positions: [
          // Previous positions
          ...(oldBanAddress?.positions || []),
          {
            type: balAdresse.position || DEFAULT_ADDR_POSITION,
            geometry: {
              type: "Point",
              coordinates: [balAdresse.long, balAdresse.lat],
            },
          },
        ],
        parcels: balAdresse.cad_parcelles,
        certified: balAdresse.certification_commune,
        updateDate: balAdresse.date_der_maj,
      }
    : undefined;
};

export default balAddrToBanAddr;
