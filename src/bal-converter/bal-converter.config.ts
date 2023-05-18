import type { IdsIdentifierKey } from "../types/bal-parser-type.js";

export const numberForTopo = "99999";

const regExpUUIDv4 =
  /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export const idsIdentifier = [
  {
    key: "addressID",
    prefix: "@",
    regExp: regExpUUIDv4,
  },
  {
    key: "mainTopoID",
    prefix: "=",
    regExp: regExpUUIDv4,
  },
  {
    key: "secondaryTopoIDs",
    prefix: "!",
    regExp: `${regExpUUIDv4.source}`,
    batch: true,
  },
] as const;

export const idsIdentifierIndex = idsIdentifier.reduce(
  (acc, { key, prefix }) => ({ ...acc, [key]: prefix }),
  {}
) as Record<IdsIdentifierKey, string>;
