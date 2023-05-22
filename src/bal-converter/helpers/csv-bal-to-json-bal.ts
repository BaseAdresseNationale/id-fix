import type { Bal } from "../../types/bal-types.js";

import Papa from "papaparse";

const csvBalToJsonBal = (csv: string): Bal => {
  return Papa.parse(csv, {
    delimiter: ";",
    header: true,
    skipEmptyLines: true,
    transform: (value: string, headerName: string) => {
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
          return value.split(",");
        case "date_der_maj":
          return new Date(value);
        default:
          return value;
      }
    },
  }).data as Bal;
};

export default csvBalToJsonBal;
