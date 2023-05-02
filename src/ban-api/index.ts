import type {
  BanID,
  BanCommonTopoID,
  DistrictInseeID,
} from "../types/ban-generic-types.d.ts";

import type { BanAddresses, BanCommonToponyms } from "../types/ban-types.d.ts";

const BAN_API_TOKEN = process.env.BAN_API_TOKEN || "";
const BAN_API_URL = process.env.BAN_API_URL || "";

const defaultHeader = {
  Authorization: `Token ${BAN_API_TOKEN}`,
  "Content-Type": "application/json",
};

export const getAddressIdsReport = async (
  codeCommune: DistrictInseeID,
  addressIDs: BanID[]
) => {
  const body = JSON.stringify({ codeCommune, addressIDs });
  const apiResponse = await fetch(`${BAN_API_URL}/address/delta-report`, {
    method: "POST",
    headers: defaultHeader,
    body,
  });

  // TODO : Implement http handler

  const apiResponseJson = await apiResponse.json();
  return apiResponseJson?.response;
};

export const createAddresses = async (addresses: BanAddresses) => {
  const body = JSON.stringify(addresses);
  const response = await fetch(`${BAN_API_URL}/address`, {
    method: "POST",
    headers: defaultHeader,
    body,
  });
  return response.json();
};

export const updateAddresses = async (addresses: BanAddresses) => {
  const body = JSON.stringify(addresses);
  const response = await fetch(`${BAN_API_URL}/address`, {
    method: "PUT",
    headers: defaultHeader,
    body,
  });
  return response.json();
};

export const deleteAddresses = async (ids: BanID[]) => {
  const body = JSON.stringify({ ids });
  const response = await fetch(`${BAN_API_URL}/address/delete`, {
    method: "POST",
    headers: defaultHeader,
    body,
  });
  return response.json();
};

export const getCommonToponymIdsReport = async (
  codeCommune: DistrictInseeID,
  commonToponymIDs: BanID[]
) => {
  const body = JSON.stringify({ codeCommune, commonToponymIDs });
  const apiResponse = await fetch(
    `${BAN_API_URL}/common-toponym/delta-report`,
    {
      method: "POST",
      headers: defaultHeader,
      body,
    }
  );

  // TODO : Implement http handler

  const apiResponseJson = await apiResponse.json();
  return apiResponseJson?.response;
};

export const createCommonToponyms = async (
  commonToponyms: BanCommonToponyms
) => {
  const body = JSON.stringify(commonToponyms);
  const response = await fetch(`${BAN_API_URL}/common-toponym`, {
    method: "POST",
    headers: defaultHeader,
    body,
  });

  return response.json();
};

export const updateCommonToponyms = async (
  commonToponyms: BanCommonToponyms
) => {
  const body = JSON.stringify(commonToponyms);
  const response = await fetch(`${BAN_API_URL}/common-toponym`, {
    method: "PUT",
    headers: defaultHeader,
    body,
  });
  return response.json();
};

export const deleteCommonToponyms = async (ids: BanCommonTopoID[]) => {
  const body = JSON.stringify({ ids });
  const response = await fetch(`${BAN_API_URL}/common-toponym/delete`, {
    method: "POST",
    headers: defaultHeader,
    body,
  });
  return response.json();
};
