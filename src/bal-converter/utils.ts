import Papa from "papaparse";

import type { Bal, BalAdresse } from "../types/bal-types.js";

const ID_NO_ADDR = "99999";

export const csvToJson = (csv: string) => {
  return Papa.parse(csv, {
    delimiter: ";",
    header: true,
    skipEmptyLines: true,
    transform: (value, headerName) => {
      switch (headerName) {
        case "commune_insee":
        case "commune_deleguee_insee":
          return value.padStart(5, "0");
        case "numero":
          return parseInt(value);
        case "x":
        case "y":
        case "long":
        case "lat":
          return parseFloat(value);
        case "certification_commune":
          return value === "1";
        case "cad_parcelles":
          return value.split("|");
        case "date_der_maj":
          return new Date(value);
        default:
          return value;
      }
    },
  }).data;
};

export const balCSVlegacy2balCSV = (balCSVlegacy: Bal): Bal => {
  return balCSVlegacy.map(
    ({
      uid_adresse: uidAdresseLegacy,
      cle_interop: cleInterop,
      ...balAdresseRest
    }: BalAdresse) => {
      const [, idVoieLegacy, idAddrLegacy] = cleInterop.split("_");
      const idVoie = `00000000-0000-4000-9000-${idVoieLegacy.padStart(
        12,
        "0"
      )}`;
      const idAddr =
        idAddrLegacy !== ID_NO_ADDR
          ? `00000000-${idAddrLegacy.padStart(
              4,
              "0"
            )}-4aaa-9aaa-${idVoieLegacy.padStart(12, "a")}`
          : "";
      const uidAdresse = uidAdresseLegacy || `${idAddr}/${idVoie}`;
      return {
        uid_adresse: uidAdresse,
        cle_interop: cleInterop,
        ...balAdresseRest,
      };
    }
  );
};
