import type {
  GeometryType,
  LangISO639v3,
} from '../../types/ban-generic-types.js';
import type {
  BalAdresse,
  BalVersion,
} from '../../types/bal-types.js';
import type { BanCommonToponym } from '../../types/ban-types.js';

import digestIDsFromBalAddr from './digest-ids-from-bal-addr.js';
import { numberForTopo as IS_TOPO_NB } from '../bal-converter.config.js';
import getLabels, { DEFAULT_ISO_LANG } from '../../utils/getLabels.js';

const balTopoToBanTopo = (
  balAdresse: BalAdresse,
  oldBanCommonToponym?: BanCommonToponym,
  balVersion?: BalVersion
): BanCommonToponym => {
  const { mainTopoID, districtID } = digestIDsFromBalAddr(
    balAdresse,
    balVersion
  );
  const labels: Record<LangISO639v3, string> = getLabels(balAdresse, 'voie_nom', DEFAULT_ISO_LANG);
  const addrNumber = balAdresse.numero;
  const cleInteropParts = balAdresse.cle_interop
    ? balAdresse.cle_interop?.split('_')
    : [];
  const deprecatedID =
    cleInteropParts.length > 1 && `${cleInteropParts[0]}_${cleInteropParts[1]}`;
  const balMeta = {
    ...(balAdresse.commune_deleguee_insee
      ? { codeAncienneCommune: balAdresse.commune_deleguee_insee }
      : {}),
    ...(balAdresse.commune_deleguee_nom
      ? { nomAncienneCommune: balAdresse.commune_deleguee_nom }
      : {}),
    ...(addrNumber === Number(IS_TOPO_NB) ? { isLieuDit: true } : {}),
    ...(deprecatedID ? { deprecatedID } : {}),
  };
  const meta = {
    ...(addrNumber === Number(IS_TOPO_NB) &&
      balAdresse.cad_parcelles &&
      balAdresse.cad_parcelles.length > 0
      ? { cadastre: { ids: balAdresse.cad_parcelles } }
      : {}),
    ...(Object.keys(balMeta).length ? { bal: balMeta } : {}),
  };
  const geometry =
    addrNumber === Number(IS_TOPO_NB) && balAdresse.long && balAdresse.lat
      ? {
        type: 'Point' as GeometryType,
        coordinates: [balAdresse.long, balAdresse.lat] as [number, number],
      }
      : undefined;

  const banCommonToponym = {
    ...(oldBanCommonToponym || {}),
    id: mainTopoID,
    districtID,
    labels: Object.entries(labels)
      .map(([isoCode, value]) => ({
        isoCode,
        value,
      }))
      .filter(({ value }) => value), // no empty value

    updateDate: balAdresse.date_der_maj,
    ...(geometry ? { geometry } : {}),
    ...(Object.keys(meta).length ? { meta } : {}),
  };

  return banCommonToponym;
};

export default balTopoToBanTopo;
