import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { checkIfBALUseBanId } from "./index.js";

const pathToMockBalJSON = "./data-mock/adresses-21286_cocorico.json";
const mockBalJSONstr = fs.readFileSync(pathToMockBalJSON, "utf8");
const balJSON = JSON.parse(mockBalJSONstr);

const pathToMockBalJSONlegacy =
  "./data-mock/adresses-21286_cocorico.legacy.json";
const mockBalJSONlegacyStr = fs.readFileSync(pathToMockBalJSONlegacy, "utf8");
const balJSONlegacy = JSON.parse(mockBalJSONlegacyStr);

const banIDWhithoutCommonToponymID =
  "@c:e2b5c142-3eb3-4d07-830a-3d1a59195dfd @a:03fb190a-cf5b-4f48-a1ab-7caa4d10e157";
const balJSONSimplifiedAndModified = [
  {
    ...balJSON[0],
  },
  {
    ...balJSON[1],
    uid_adresse: banIDWhithoutCommonToponymID,
  },
];

describe("balTopoToBanTopo", () => {
  test("Should return true as bal uses ban IDs", async () => {
    expect(checkIfBALUseBanId(balJSON)).toMatchSnapshot();
  });

  test("Should return false as bal does not use ban IDs", async () => {
    expect(checkIfBALUseBanId(balJSONlegacy)).toMatchSnapshot();
  });

  test("Should return false as bal does not have a common toponym ID on one of its line", async () => {
    expect(checkIfBALUseBanId(balJSONSimplifiedAndModified)).toMatchSnapshot();
  });
});
