import type {
  BanID,
  BanCommonTopoID,
  DistrictInseeID,
  PositionType,
  DateISO8601,
  LangISO639v3,
} from "./ban-generic-types";

export type UIdAdresse = `${BanID}${`/${BanCommonTopoID}` | ""}`;

export type CommuneNomIsoCodeKey = `commune_nom_${LangISO639v3}`;
export type CommuneDelegueeNomIsoCodeKey =
  `commune_deleguee_nom_${LangISO639v3}`;
export type VoieNomIsoCodeKey = `voie_nom_${LangISO639v3}`;
export type LieuditComplementNomIsoCodeKey =
  `lieudit_complement_nom_${LangISO639v3}`;

export type BalAdresse = {
  uid_adresse?: UIdAdresse;
  cle_interop: string;
  commune_insee: DistrictInseeID;
  commune_nom: string;
  commune_deleguee_insee?: string;
  commune_deleguee_nom?: string;
  voie_nom: string;
  lieudit_complement_nom?: string;
  numero?: number;
  suffixe?: string;
  position: PositionType;
  x: number;
  y: number;
  long: number;
  lat: number;
  cad_parcelles?: string[];
  source: string;
  date_der_maj: DateISO8601;
  certification_commune: boolean;
  [key?: CommuneNomIsoCodeKey]: string;
  [key?: CommuneDelegueeNomIsoCodeKey]: string;
  [key?: VoieNomIsoCodeKey]: string;
  [key?: LieuditComplementNomIsoCodeKey]: string;
};

export type Bal = BalAdresse[];
