import type { LangISO639v3 } from "../../types/ban-generic-types.js";
import type { BalAdresse, VoieNomIsoCodeKey } from "../../types/bal-types.js";
import type { BanCommonToponym } from "../../types/ban-types.js";

import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";
import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";

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
  const addrNumber = balAdresse.numero
  const meta = addrNumber === Number(IS_TOPO_NB) && balAdresse.cad_parcelles && balAdresse.cad_parcelles.length > 0 
    ? {cadastre: {ids: balAdresse.cad_parcelles}} 
    : {}

  const geometry = addrNumber === Number(IS_TOPO_NB) && balAdresse.long && balAdresse.lat 
    ? {
      type: "Point",
      coordinates: [balAdresse.long, balAdresse.lat],
    }
    : {}

  return {
    ...(oldBanCommonToponym || {}),
    id: mainTopoID,
    districtID,
    labels: Object.entries(labels).map(([isoCode, value]) => ({
      isoCode,
      value,
    })),
    geometry,
    updateDate: balAdresse.date_der_maj,
    meta,
  };
};

export default balTopoToBanTopo;
