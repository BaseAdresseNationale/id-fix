export type BanID = string;
export type BanCommonTopoID = string;
export type DistrictInseeID = string;
export type PositionType =
  | "entrée"
  | "parcelle"
  | "voie"
  | "lieu-dit"
  | "commune"
  | "ancienne-entrée"
  | "ancienne-parcelle"
  | "ancienne-voie"
  | "ancien-lieu-dit"
  | "ancienne-commune"
  | "autre"; // TODO: update with more possible values OR Comply with the defined BAL Standard : https://aitf-sig-topo.github.io/voies-adresses/files/AITF_SIG_Topo_Format_Base_Adresse_Locale_v1.3.pdf
export type ToponymType =
  | "voie"
  | "lieu-dit"
  | "commune"
  | "ancienne-voie"
  | "ancien-lieu-dit"
  | "ancienne-commune"
  | "site-historique"
  | "point-of-interest"
  | "autre"; // TODO: update with more possible values ?
export type DateISO8601 = string;
export type LangISO639v3 = string;
