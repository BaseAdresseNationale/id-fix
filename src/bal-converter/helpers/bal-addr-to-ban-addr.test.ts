import type { BalAdresse } from "../../types/bal-types.js";
import type { BanAddress } from "../../types/ban-types.js";

import { describe, expect, test } from "vitest";
import {
  idsIdentifierIndex,
  numberForTopo as IS_TOPO_NB,
} from "../bal-converter.config.js";
import { addrID, mainTopoID, secondaryTopoIDs } from "./__mocks__/fake-data.js";
import balAddrToBanAddr from "./bal-addr-to-ban-addr";

const idSampleWithBanId = `${idsIdentifierIndex.addressID}${addrID}`;
const idSampleWithMainTopoId = `${idsIdentifierIndex.mainTopoID}${mainTopoID}`;
const idSampleWithBanIdAndMainTopoId = `${idsIdentifierIndex.addressID}${addrID} ${idsIdentifierIndex.mainTopoID}${mainTopoID}`;
const idSampleWithAllIds = `${idsIdentifierIndex.addressID}${addrID} ${
  idsIdentifierIndex.mainTopoID
}${mainTopoID} !${secondaryTopoIDs.join("|")}`;

const defaultTestBalAddress: BalAdresse = {
  cle_interop: "21286_0001_00001",
  commune_insee: "21286",
  commune_nom: "Cocorico",
  voie_nom: "Route de la Baleine",
  numero: 1,
  position: "entrée",
  x: 1,
  y: 2,
  long: 1,
  lat: 2,
  date_der_maj: "2021-01-01",
  certification_commune: true,
  source: "BAL",
};

describe("balAddrToBanAddr", () => {
  test("should return BanAddress without BanID & BanTopoID", async () => {
    expect(balAddrToBanAddr(defaultTestBalAddress)).toMatchSnapshot();
  });

  test("should return BanAddress with BanID without BanTopoID", async () => {
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithBanId,
    };

    expect(balAddrToBanAddr(testBalAddress)).toMatchSnapshot();
  });

  test("should return BanAddress with BanTopoID", async () => {
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithMainTopoId,
    };

    expect(balAddrToBanAddr(testBalAddress)).toMatchSnapshot();
  });

  test("should return BanAddress with BanID and BanTopoID", async () => {
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithBanIdAndMainTopoId,
    };

    expect(balAddrToBanAddr(testBalAddress)).toMatchSnapshot();
  });

  test("should return BanAddress with BanID, BanTopoID and other toponyms", async () => {
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithAllIds,
    };

    expect(balAddrToBanAddr(testBalAddress)).toMatchSnapshot();
  });

  test("should not consider as Ban Address", async () => {
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithMainTopoId,
      numero: Number(IS_TOPO_NB),
    };

    expect(balAddrToBanAddr(testBalAddress)).toMatchSnapshot();
  });

  test("should return BanAddress with multiple positions", async () => {
    const testOldBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithAllIds,
      position: "entrée",
      x: 1,
      y: 2,
      long: 1,
      lat: 2,
    };
    const oldBanAddress = balAddrToBanAddr(testOldBalAddress) as BanAddress;
    const testBalAddress: BalAdresse = {
      ...defaultTestBalAddress,
      uid_adresse: idSampleWithAllIds,
      position: "autre",
      x: 3,
      y: 4,
      long: 3,
      lat: 4,
    };

    expect(balAddrToBanAddr(testBalAddress, oldBanAddress)).toMatchSnapshot();
  });
});
