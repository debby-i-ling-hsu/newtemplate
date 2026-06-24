// 前端設定統一從這裡讀。API 走同網域相對路徑（dev 由 vite proxy 轉到後端）。
// 後端 API 已版本化，預設打 /api/v1。
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
};
