import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

import { config } from "@/lib/config";
import { tokenStore } from "@/lib/tokens";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({ baseURL: config.apiBaseUrl });

api.interceptors.request.use(async (req) => {
  const token = await tokenStore.getAccess();
  if (token) {
    const headers = AxiosHeaders.from(req.headers);
    headers.set("Authorization", `Bearer ${token}`);
    req.headers = headers;
  }
  return req;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const resp = await axios.post(`${config.apiBaseUrl}/accounts/token/refresh/`, { refresh });
    const access = resp.data.access as string;
    await tokenStore.set(access);
    return access;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config as RetriableRequestConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const access = await refreshing;
      refreshing = null;
      if (access) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${access}`);
        original.headers = headers;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
