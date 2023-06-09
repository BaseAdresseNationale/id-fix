import type {
  BanID,
  BanCommonTopoID,
  DistrictInseeID,
} from "../types/ban-generic-types.d.ts";
import HandleHTTPResponse from "../utils/http-request-handler.js";

import type { BanAddresses, BanCommonToponyms } from "../types/ban-types.d.ts";

const BAN_API_TOKEN = process.env.BAN_API_TOKEN || "";
const BAN_API_URL = process.env.BAN_API_URL || "";

const defaultHeader = {
  Authorization: `Token ${BAN_API_TOKEN}`,
  "Content-Type": "application/json",
};

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

export const getAddressIdsReport = async (
  districtID: DistrictInseeID,
  addressIDs: BanID[]
) => {
  try {
    const body = JSON.stringify({ districtID, addressIDs });
    const response = await fetch(`${BAN_API_URL}/address/delta-report`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });

    const responseJson = await HandleHTTPResponse(response);
    return responseJson?.response;
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const createAddresses = async (addresses: BanAddresses) => {
  try {
    const body = JSON.stringify(addresses);
    const response = await fetch(`${BAN_API_URL}/address`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const updateAddresses = async (addresses: BanAddresses) => {
  try {
    const body = JSON.stringify(addresses);
    const response = await fetch(`${BAN_API_URL}/address`, {
      method: "PUT",
      headers: defaultHeader,
      body,
    });
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const deleteAddresses = async (ids: BanID[]) => {
  try {
    const body = JSON.stringify(ids);
    const response = await fetch(`${BAN_API_URL}/address/delete`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const getCommonToponymIdsReport = async (
  districtID: DistrictInseeID,
  commonToponymIDs: BanID[]
) => {
  try {
    const body = JSON.stringify({ districtID, commonToponymIDs });
    const response = await fetch(`${BAN_API_URL}/common-toponym/delta-report`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });

    const responseJson = await HandleHTTPResponse(response);
    return responseJson?.response;
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const createCommonToponyms = async (
  commonToponyms: BanCommonToponyms
) => {
  try {
    const body = JSON.stringify(commonToponyms);
    const response = await fetch(`${BAN_API_URL}/common-toponym`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });

    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const updateCommonToponyms = async (
  commonToponyms: BanCommonToponyms
) => {
  try {
    const body = JSON.stringify(commonToponyms);
    const response = await fetch(`${BAN_API_URL}/common-toponym`, {
      method: "PUT",
      headers: defaultHeader,
      body,
    });
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};

export const deleteCommonToponyms = async (ids: BanCommonTopoID[]) => {
  try {
    const body = JSON.stringify({ ids });
    const response = await fetch(`${BAN_API_URL}/common-toponym/delete`, {
      method: "POST",
      headers: defaultHeader,
      body,
    });
    return await HandleHTTPResponse(response);
  } catch (error) {
    const { message } = error as Error;
    throw new Error(`Ban API - ${message}`);
  }
};
