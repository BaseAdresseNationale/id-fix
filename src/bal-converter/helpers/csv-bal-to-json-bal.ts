import type { Bal, BalAdresse } from '../../types/bal-types.js';

import Papa from 'papaparse';

const TOPONYME_LANG_PREFIX = 'toponyme_';
const VOIE_NOM_PREFIX = 'voie_nom_';
const LANG_SUFFIX_LENGTH = 3;

/** Normalise les champs 1.5 toponyme → voie_nom pour réutiliser le pipeline 1.4 (sans modifier 1.3/1.4). */
const normalizeToponymeToVoie = (row: BalAdresse): void => {
  if (row.toponyme !== undefined) {
    // En 1.5, toponyme est prioritaire: on ignore voie_nom même si présent.
    row.voie_nom = row.toponyme;
  }
  Object.keys(row).forEach((key) => {
    if (key.startsWith(TOPONYME_LANG_PREFIX) && key.length === TOPONYME_LANG_PREFIX.length + LANG_SUFFIX_LENGTH) {
      const lang = key.slice(TOPONYME_LANG_PREFIX.length);
      const voieKey = `${VOIE_NOM_PREFIX}${lang}` as keyof BalAdresse;
      const value = row[key as keyof BalAdresse];
      if (typeof value === 'string') {
        // En 1.5, toponyme_<lang> est prioritaire sur voie_nom_<lang>.
        (row as unknown as Record<string, string>)[voieKey as string] = value;
      }
    }
  });
};

const csvBalToJsonBal = (csv: string): Bal => {
  const bal = Papa.parse(csv, {
    delimiter: ';',
    header: true,
    skipEmptyLines: true,
    transform: (value: string, headerName: string) => {
      const trimmedValue = value.trim();
      const trimmedHeaderName = headerName.trim();
      switch (trimmedHeaderName) {
        case 'commune_insee':
        case 'commune_deleguee_insee':
          return trimmedValue && trimmedValue.padStart(5, '0');
        case 'numero':
          return parseInt(trimmedValue);
        case 'x':
        case 'y':
        case 'long':
        case 'lat':
          return parseFloat(trimmedValue);
        case 'certification_commune':
          return trimmedValue === '1';
        case 'cad_parcelles':
          return trimmedValue !== ''
            ? value.split('|').map((value) => value.trim())
            : [];
        case 'date_der_maj':
          return new Date(trimmedValue);
        case 'id_ban_commune':
        case 'id_ban_toponyme':
        case 'id_ban_adresse':
          return trimmedValue.toLowerCase();
        default:
          return trimmedValue;
      }
    },
  }).data as Bal;

  bal.forEach(normalizeToponymeToVoie);
  return bal;
};

export default csvBalToJsonBal;
