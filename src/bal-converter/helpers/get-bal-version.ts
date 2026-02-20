import { Bal } from '../../types/bal-types';

const getBalVersion = (bal: Bal) => {
  const first = bal[0];
  if (!first) {
    throw new Error('BAL vide: impossible de detecter la version');
  }

  // BAL 1.5 : colonne toponyme à la place de voie_nom
  if ('toponyme' in first) {
    return '1.5';
  }

  // If column id_ban_commune is defined in BAL csv, the BAL is using version 1.4
  // If not, we consider that the BAL is using version 1.3
  const { id_ban_commune: districtID } = first;
  if (districtID) {
    return '1.4';
  }

  return '1.3';
};

export default getBalVersion;
