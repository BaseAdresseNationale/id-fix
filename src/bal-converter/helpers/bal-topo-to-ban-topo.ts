import type { LangISO639v3 } from "../../types/ban-generic-types.js";
import type { BalAdresse, VoieNomIsoCodeKey } from "../../types/bal-types.js";
import type { BanCommonToponym } from "../../types/ban-types.js";

import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const DEFAULT_ISO_LANG = "fra";

const balTopoToBanTopo = (
  balAdresse: BalAdresse,
  oldBanCommonToponym?: BanCommonToponym
): BanCommonToponym => {
  const { mainTopoID, districtID } = digestIDsFromBalAddr(balAdresse);
  const isoCodeFromBalNomVoie = (key: LangISO639v3) => key.trim().split("_")[2];
  const labels = {
    [DEFAULT_ISO_LANG]: balAdresse.voie_nom,
    ...Object.fromEntries(
      (
        Object.keys(balAdresse).filter((key) =>
          key.startsWith("voie_nom_")
        ) as VoieNomIsoCodeKey[]
      ).map((key) => [isoCodeFromBalNomVoie(key), balAdresse[key]])
    ),
  };

  return {
    ...(oldBanCommonToponym || {}),
    id: mainTopoID,
    districtID,
    label: Object.entries(labels).map(([isoCode, value]) => ({
      isoCode,
      value,
    })), // TODO: rename key 'label' to 'labels'
    type: { value: "voie" }, // TODO: How to get the type from the BAL?
    geometry: {
      type: "Point",
      coordinates: [balAdresse.long, balAdresse.lat],
    },
    parcels: balAdresse.cad_parcelles,
    updateDate: balAdresse.date_der_maj,
  };
};

export default balTopoToBanTopo;
