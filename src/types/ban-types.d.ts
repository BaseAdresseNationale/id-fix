import type {
  BanID,
  BanCommonTopoID,
  DistrictInseeID,
  PositionType,
  ToponymType,
  DateISO8601,
  LangISO639v3,
} from "./ban-generic-types.js";

// TODO: use english names ?

export type Position = {
  type: PositionType;
  geometry: {
    type: "Point";
    coordinates: [number, number, number?];
  };
};

export type BanDistrict = {
  codeCommune: DistrictInseeID; // code INSEE de la commune
  nomCommune: string; // nom de la commune
  dateMAJ: DateISO8601; // date de mise à jour de la commune
};

export type BanDistricts = BanDistrict[];

export type BanCommonToponym = {
  id: BanCommonTopoID; // identifiant unique de la voie
  codeCommune: DistrictInseeID; // code INSEE de la commune
  label: {
    isoCode: LangISO639v3; // code ISO de la langue
    value: string; // nom de la voie
  }[];
  type: {
    value: ToponymType; // type de la voie (voie, lieu-dit, etc.)
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number?];
  };
  dateMAJ: DateISO8601; // date de mise à jour de la voie
};

export type BanCommonToponyms = BanCommonToponym[];

export type BanAddress = {
  id: BanID; // identifiant unique de l'adresse
  codeCommune: DistrictInseeID; // code INSEE de la commune
  idVoie: BanCommonTopoID; // identifiant unique de la voie
  numero: number; // numéro de l'adresse
  suffixe?: string;
  positions: Position[]; // positions géographiques de l'adresse
  parcelles?: string[]; // parcelles cadastrales de l'adresse // TODO: Verrifier que les parcelles ne soit pas par position et non par adresse
  certifie?: boolean;
  dateMAJ: DateISO8601; // date de mise à jour de l'adresse
};

export type BanAddresses = BanAddress[];

export type Ban = {
  districtID: DistrictInseeID; // code INSEE de la commune
  commonToponyms?: Record<BanCommonTopoID, BanCommonToponym>; // voies, lieux-dits, etc.
  addresses?: Record<BanID, BanAddress>; // adresses
};
