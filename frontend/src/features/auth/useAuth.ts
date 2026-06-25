import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMe, updateMe, type MeUpdate } from "./api";
import { tokenStore } from "@/lib/tokens";

// 以 /me 的查詢結果代表登入狀態與角色。
export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!tokenStore.getAccess(),
    retry: false,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MeUpdate) => updateMe(payload),
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });
}
