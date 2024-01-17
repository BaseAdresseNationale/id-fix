import hash from "object-hash";

import type {
  GeometryType,
  LangISO639v3,
} from "../../types/ban-generic-types.js";
import type {
  BalAdresse,
  BalVersion,
  VoieNomIsoCodeKey,
} from "../../types/bal-types.js";
import type { BanCommonToponym } from "../../types/ban-types.js";

import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";
import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";

const DEFAULT_ISO_LANG = "fra";

const balTopoToBanTopo = (
  balAdresse: BalAdresse,
  oldBanCommonToponym?: BanCommonToponym,
  balVersion?: BalVersion
): BanCommonToponym => {
  const { mainTopoID, districtID } = digestIDsFromBalAddr(
    balAdresse,
    balVersion
  );
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
  const addrNumber = balAdresse.numero;
  const balMeta = {
    ...(balAdresse.commune_deleguee_insee
      ? { codeAncienneCommune: balAdresse.commune_deleguee_insee }
      : {}),
    ...(balAdresse.commune_deleguee_nom
      ? { nomAncienneCommune: balAdresse.commune_deleguee_nom }
      : {}),
    ...(addrNumber === Number(IS_TOPO_NB) ? { isLieuDit: true } : {}),
  };
  const meta = {
    ...(balAdresse.cad_parcelles && balAdresse.cad_parcelles.length > 0
      ? { cadastre: { ids: balAdresse.cad_parcelles } }
      : {}),
    ...(Object.keys(balMeta).length ? { bal: balMeta } : {}),
  };
  const geometry =
    addrNumber === Number(IS_TOPO_NB) && balAdresse.long && balAdresse.lat
      ? {
          type: "Point" as GeometryType,
          coordinates: [balAdresse.long, balAdresse.lat] as [number, number],
        }
      : undefined;

  const banCommonToponym = {
    ...(oldBanCommonToponym || {}),
    id: mainTopoID,
    districtID,
    labels: Object.entries(labels).map(([isoCode, value]) => ({
      isoCode,
      value,
    })),

    updateDate: balAdresse.date_der_maj,
    ...(geometry ? { geometry } : {}),
    ...(Object.keys(meta).length ? { meta } : {}),
  };

  // Store the md5 of the common toponym to be able to compare it with the one in the BAN database
  banCommonToponym.meta = {
    ...meta,
    idfix: {
      hash: hash.MD5(banCommonToponym),
    },
  };

  return banCommonToponym;
};

export default balTopoToBanTopo;
