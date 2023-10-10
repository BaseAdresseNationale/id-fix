import type { LangISO639v3 } from "../../types/ban-generic-types.js";
import type { BalAdresse, LieuditComplementNomIsoCodeKey } from "../../types/bal-types.js";
import type { BanAddress } from "../../types/ban-types.js";

import { numberForTopo as IS_TOPO_NB } from "../bal-converter.config.js";
import { convertBalPositionTypeToBanPositionType } from "./bal-position-type-to-ban-position-type.js";
import digestIDsFromBalAddr from "./digest-ids-from-bal-addr.js";

const DEFAULT_BAN_ADDR_POSITION = "other";
const DEFAULT_ISO_LANG = "fra";

const balAddrToBanAddr = (
  balAdresse: BalAdresse,
  oldBanAddress?: BanAddress
): BanAddress | undefined => {
  const { addressID, mainTopoID, secondaryTopoIDs, districtID } = digestIDsFromBalAddr(balAdresse);
  const addrNumber = balAdresse.numero || oldBanAddress?.number;
  const positionType = convertBalPositionTypeToBanPositionType(balAdresse.position);
  const suffix = balAdresse.suffixe
  const isoCodeFromBalLieuDitComplementNom = (key: LangISO639v3) => key.trim().split("_")[3];
  const labels = balAdresse.lieudit_complement_nom ? {
    [DEFAULT_ISO_LANG]: balAdresse.lieudit_complement_nom,
    ...Object.fromEntries(
      (
        Object.keys(balAdresse).filter((key) =>
          key.startsWith("lieudit_complement_nom_")
        ) as LieuditComplementNomIsoCodeKey[]
      ).map((key) => [isoCodeFromBalLieuDitComplementNom(key), balAdresse[key]])
    ),
  } : undefined;

  
  const balMeta = {
    ...(balAdresse.commune_deleguee_insee ? {codeAncienneCommune: balAdresse.commune_deleguee_insee} : {}),
    ...(balAdresse.commune_deleguee_nom ? {nomAncienneCommune: balAdresse.commune_deleguee_nom} : {}),
  }
  const meta = {
    ...(balAdresse.cad_parcelles && balAdresse.cad_parcelles.length > 0 ? {cadastre: {ids: balAdresse.cad_parcelles}} : {}),
    ...(Object.keys(balMeta).length ? {bal: balMeta} : {})
  }
  return addrNumber && addrNumber !== Number(IS_TOPO_NB)
    ? {
        ...(oldBanAddress || {}),
        id: addressID,
        districtID,
        mainCommonToponymID: mainTopoID,
        secondaryCommonToponymIDs: secondaryTopoIDs,
        number: addrNumber,
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
        ...(labels ? {labels : Object.entries(labels).map(([isoCode, value]) => ({isoCode, value}))} : {}),
        ...(suffix ? {suffix} : {}),
        ...(Object.keys(meta).length ? {meta} : {})
      }
    : undefined;
};

export default balAddrToBanAddr;
