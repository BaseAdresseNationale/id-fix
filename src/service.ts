/// <reference lib="dom" />
const BAN_API_URL = process.env.BAN_API_URL || "";
const BAN_API_TOKEN = process.env.BAN_API_TOKEN || "";
const API_DEPOT_URL = process.env.API_DEPOT_URL || "";

export const legacyCompose = async (districtID: string) => {
  const response = await fetch(
    `${BAN_API_URL}/ban/communes/${districtID}/compose`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${BAN_API_TOKEN}`,
      },
    }
  );
  return response.json();
};

export const getRevisionFromDistrictID = async (codeCommune: string) => {
  const response = await fetch(
    `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`
  );
  return response.json();
};

export const getRevisionFileText = async (revisionId: string) => {
  const response = await fetch(
    `${API_DEPOT_URL}/revisions/${revisionId}/files/bal/download`
  );
  return response.text();
};
