import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "@/features/auth/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
  });
}
