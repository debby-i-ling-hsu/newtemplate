import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// 開發時前端跑在 :3000，API 請求 proxy 到後端（compose 內為 web:8000）。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    base: mode === "production" ? "/static/" : "/",
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true },
        "/admin": { target: proxyTarget, changeOrigin: true },
        "/static": { target: proxyTarget, changeOrigin: true },
        "/media": { target: proxyTarget, changeOrigin: true },
        "/healthz": { target: proxyTarget, changeOrigin: true },
      },
    },
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  };
});
