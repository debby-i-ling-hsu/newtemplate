import * as SecureStore from "expo-secure-store";

const ACCESS = "access_token";
const REFRESH = "refresh_token";

export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  set: async (access: string, refresh?: string) => {
    await SecureStore.setItemAsync(ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
