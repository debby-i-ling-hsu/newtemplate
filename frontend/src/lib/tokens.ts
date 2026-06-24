// JWT 存放在 localStorage。集中管理，方便日後改成 cookie 等策略。
const ACCESS = "access_token";
const REFRESH = "refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  set: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
