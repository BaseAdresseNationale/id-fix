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
  districtID: DistrictInseeID; // code INSEE de la commune
  labels: {
    isoCode: LangISO639v3; // code ISO de la langue
    value: string; // nom de la voie
  }[];
  updateDate: DateISO8601; // date de mise à jour de la commune
};

export type BanDistricts = BanDistrict[];

export type Meta = {
  cadastre?:{
    ids: string[];
  }
}

export type BanCommonToponym = {
  id?: BanCommonTopoID; // identifiant unique de la voie
  districtID: DistrictInseeID; // code INSEE de la commune
  labels: {
    isoCode: LangISO639v3; // code ISO de la langue
    value: string; // nom de la voie
  }[];
  type: {
    value: ToponymType; // type de la voie (voie, lieu-dit, etc.)
  };
  geometry: {
    type?: string;
    coordinates?: number[];
  };
  updateDate: DateISO8601; // date de mise à jour de la voie
  meta: Meta
};

export type BanCommonToponyms = BanCommonToponym[];

export type BanAddress = {
  id?: BanID; // identifiant unique de l'adresse
  districtID: DistrictInseeID; // code INSEE de la commune
  mainCommonToponymID: BanCommonTopoID; // identifiant unique du toponyme principal
  secondaryCommonToponymIDs?: BanCommonTopoID[]; // identifiant unique des toponymes secondaires
  number: number; // numéro de l'adresse
  suffix?: string;
  positions: Position[]; // positions géographiques de l'adresse
  certified?: boolean;
  updateDate: DateISO8601; // date de mise à jour de l'adresse
  meta: Meta
};

export type BanAddresses = BanAddress[];

export type Ban = {
  districtID: DistrictInseeID; // code INSEE de la commune
  commonToponyms?: Record<BanCommonTopoID, BanCommonToponym>; // voies, lieux-dits, etc.
  addresses?: Record<BanID, BanAddress>; // adresses
};
