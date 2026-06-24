import axios from "axios";
import { config } from "@/config";
import { tokenStore } from "@/lib/tokens";

// 單一 axios 實例：自動帶 JWT，401 時嘗試用 refresh token 換新 access。
export const api = axios.create({ baseURL: config.apiBaseUrl });

api.interceptors.request.use((req) => {
  const token = tokenStore.getAccess();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const resp = await axios.post(`${config.apiBaseUrl}/accounts/token/refresh/`, { refresh });
    const access = resp.data.access as string;
    tokenStore.set(access);
    return access;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const access = await refreshing;
      refreshing = null;
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
