import HandleHTTPResponse from "../utils/http-request-handler.js";

const API_DEPOT_URL = process.env.API_DEPOT_URL || "";

export const getRevisionData = async (cog: string) => {
  const revision = await getRevisionFromDistrictCOG(cog);
  const balTextData = await getRevisionFileText(revision._id);
  return {revision, balTextData};
}

const getRevisionFromDistrictCOG = async (cog: string) => {
  try {
    const response = await fetch(
      `${API_DEPOT_URL}/communes/${cog}/current-revision`
    );
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Dump API - ${message}`);
  }
};

const getRevisionFileText = async (revisionId: string) => {
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
