import type { BalAdresse } from "../../types/bal-types.js";
import type { BanCommonToponym } from "../../types/ban-types.js";

import { describe, expect, test } from "vitest";
import { idsIdentifierIndex } from "../bal-converter.config.js";
import { addrID, mainTopoID, secondaryTopoIDs } from "./__mocks__/fake-data.js";
import balTopoToBanTopo from "./bal-topo-to-ban-topo";

const idSampleWithBanId = `${idsIdentifierIndex.addressID}${addrID}`;
const idSampleWithMainTopoId = `${idsIdentifierIndex.mainTopoID}${mainTopoID}`;
const idSampleWithBanIdAndMainTopoId = `${idsIdentifierIndex.addressID}${addrID} ${idsIdentifierIndex.mainTopoID}${mainTopoID}`;
const idSampleWithAllIds = `${idsIdentifierIndex.addressID}${addrID} ${
  idsIdentifierIndex.mainTopoID
}${mainTopoID} !${secondaryTopoIDs.join("|")}`;

const defaultTestBalAdresse: BalAdresse = {
  cle_interop: "21286_0001_00001",
  commune_insee: "21286",
  commune_nom: "Cocorico",
  voie_nom: "Route de la Baleine",
  numero: 1,
  position: "autre",
  x: 1,
  y: 2,
  long: 1,
  lat: 2,
  date_der_maj: "2021-01-01",
  certification_commune: true,
  source: "BAL",
};

describe("balTopoToBanTopo", () => {
  test("should return BanToponym without BanTopoID", async () => {
    expect(balTopoToBanTopo(defaultTestBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym without BanTopoID", async () => {
    // TODO: In next version - should probably return BanToponym without temporary BanTopoID ?
    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithBanId,
    };
    expect(balTopoToBanTopo(testBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym with BanTopoID (1)", async () => {
    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithMainTopoId,
    };
    expect(balTopoToBanTopo(testBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym with BanTopoID (2)", async () => {
    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithBanIdAndMainTopoId,
    };
    expect(balTopoToBanTopo(testBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym with BanTopoID and other toponyms", async () => {
    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithAllIds,
    };
    expect(balTopoToBanTopo(testBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym with multilingual label", async () => {
    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithMainTopoId,
      voie_nom: "Route de la Baleine",
      voie_nom_eus: "Baleen ibilbidea",
    };
    expect(balTopoToBanTopo(testBalAdresse)).toMatchSnapshot();
  });

  test("should return BanToponym with overwrited data", async () => {
    // TODO : In next version - should probably not return BanToponym with overwrited data and throw an error ?

    const testOldBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithAllIds,
      voie_nom: "Route de la Baleine",
    };
    const oldBanToponym = balTopoToBanTopo(
      testOldBalAdresse
    ) as BanCommonToponym;

    const testBalAdresse: BalAdresse = {
      ...defaultTestBalAdresse,
      uid_adresse: idSampleWithAllIds,
      voie_nom: "Avenue Rhoam Bosphoramus",
    };
    expect(balTopoToBanTopo(testBalAdresse, oldBanToponym)).toMatchSnapshot();
  });
});
