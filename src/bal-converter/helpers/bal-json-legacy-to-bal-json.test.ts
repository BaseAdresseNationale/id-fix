import type { BalAdresse } from "../../types/bal-types.js";

import fs from "node:fs";
import { describe, expect, test } from "vitest";
import balJSONlegacy2balJSON from "./bal-json-legacy-to-bal-json.js";

const pathToMockBalJSON = "./data-mock/adresses-21286_cocorico.json";
const mockBalJSONstr = fs.readFileSync(pathToMockBalJSON, "utf8");
const balJSONlegacy = JSON.parse(mockBalJSONstr).map(
  (balAddress: BalAdresse) => ({
    ...balAddress,
    date_der_maj: new Date(balAddress.date_der_maj),
  })
);

describe("balJSONlegacy2balJSON", () => {
  test("should convert BAL JSON legacy into BAL JSON with BanIDs", async () => {
    const balJSON = balJSONlegacy2balJSON(balJSONlegacy);
    expect(balJSON).toMatchSnapshot();
  });
});
