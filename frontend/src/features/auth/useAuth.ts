import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";
import { tokenStore } from "@/lib/tokens";

// 以 /me 的查詢結果代表登入狀態：有 token 才打，401 由 api 攔截器處理。
export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!tokenStore.getAccess(),
    retry: false,
  });
}
