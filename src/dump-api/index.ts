import HandleHTTPResponse from "../utils/http-request-handler.js";

const API_DEPOT_URL = process.env.API_DEPOT_URL || "";

export const getRevisionFromDistrictID = async (codeCommune: string) => {
  try {
    const response = await fetch(
      `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`
    );
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Dump API - ${message}`);
  }
};

export const getRevisionFileText = async (revisionId: string) => {
  try {
    const response = await fetch(
      `${API_DEPOT_URL}/revisions/${revisionId}/files/bal/download`
    );
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Dump API - ${message}`);
  }
};
