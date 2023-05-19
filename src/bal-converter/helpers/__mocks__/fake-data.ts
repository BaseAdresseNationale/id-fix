import { idsIdentifierIndex } from "../../bal-converter.config.js";

export const addrID = "aaaaaaaa-0000-4aaa-9000-1234567890aa";
export const mainTopoID = "bbbbbbbb-0000-4aaa-9000-1234567890bb";
export const secondaryTopoIDs = [
  "cccccccc-0000-4aaa-9000-1234567890cc",
  "cccccccc-1111-4aaa-9000-1234567890dd",
  "cccccccc-2222-4aaa-9000-1234567890ee",
];

const {
  addressID: addressIDKey,
  mainTopoID: mainTopoIDKey,
  secondaryTopoIDs: secondaryTopoIDsKey,
} = idsIdentifierIndex;

export const idSampleWithBanId = `${addressIDKey}${addrID}`;
export const idSampleWithMainTopoId = `${mainTopoIDKey}${mainTopoID}`;
export const idSampleWithSecondaryTopoId = `${secondaryTopoIDsKey}${secondaryTopoIDs.join(
  "|"
)}`;
export const idSampleWithBanIdAndMainTopoId = `${addressIDKey}${addrID} ${mainTopoIDKey}${mainTopoID}`;
export const idSampleWithBanIdAndSecondaryTopoId = `${addressIDKey}${addrID} ${secondaryTopoIDsKey}${secondaryTopoIDs.join(
  "|"
)}`;
export const idSampleWithAllIds = `${addressIDKey}${addrID} ${mainTopoIDKey}${mainTopoID} ${secondaryTopoIDsKey}${secondaryTopoIDs.join(
  "|"
)}`;
