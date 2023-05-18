import { describe, expect, test } from "vitest";
import {
  idSampleWithBanId,
  idSampleWithMainTopoId,
  idSampleWithSecondaryTopoId,
  idSampleWithBanIdAndMainTopoId,
  idSampleWithBanIdAndSecondaryTopoId,
  idSampleWithAllIds,
} from "./__mocks__/fake-data.js";
import digestIDsFromBalUIDs from "./digest-ids-from-bal-uids.js";

describe("digestIDsFromBalUIDs", () => {
  test("should return an empty object for an undefined BanIDs", async () => {
    const id = digestIDsFromBalUIDs();
    expect(id).toMatchSnapshot();
  });
  test("should return an empty object for an empty BanIDs string", async () => {
    const id = digestIDsFromBalUIDs("");
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with only addrID", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithBanId);
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with only mainTopoID", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithMainTopoId);
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with only secondaryTopoIDs", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithSecondaryTopoId);
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with addrID and mainTopoID", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithBanIdAndMainTopoId);
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with addrID and secondaryTopoIDs", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithBanIdAndSecondaryTopoId);
    expect(id).toMatchSnapshot();
  });
  test("should return an object with BanID for an BanIDs with addrID, mainTopoID and secondaryTopoIDs", async () => {
    const id = digestIDsFromBalUIDs(idSampleWithAllIds);
    expect(id).toMatchSnapshot();
  });
});
