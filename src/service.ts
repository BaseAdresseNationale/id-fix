const BAN_API_URL = process.env.BAN_API_URL || "";
const BAN_API_TOKEN = process.env.BAN_API_TOKEN || "";
const API_DEPOT_URL = process.env.API_DEPOT_URL || "";

export const legacyCompose = async (districtID: string) => {
  try {
    const response = await fetch(
      `${BAN_API_URL}/ban/communes/${districtID}/compose`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${BAN_API_TOKEN}`,
        },
      }
    );
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban legacy API - ${message}`);
  }
};

export const getRevisionFromDistrictID = async (codeCommune: string) => {
  try {
    const response = await fetch(
      `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`
    );
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Deposit API - ${message}`);
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
    throw new Error(`Deposit API - ${message}`);
  }
};

// Handlers

const HandleHTTPResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    let error;
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      error = new Error(data.message || response.statusText);
    } else {
      const text = await response.text();
      error = new Error(text || response.statusText);
    }
    throw error;
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text();
  }
};
