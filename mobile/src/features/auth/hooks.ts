import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchMe, updateMe, type MeUpdate } from "@/features/auth/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MeUpdate) => updateMe(payload),
    onSuccess: (user) => qc.setQueryData(["auth", "me"], user),
  });
}
