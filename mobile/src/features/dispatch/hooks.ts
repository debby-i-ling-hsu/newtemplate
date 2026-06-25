import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  abandonBooking,
  listDispatch,
  submitCompletion,
  type CompletionSubmit,
} from "@/features/dispatch/api";

export function useDispatch(date: string) {
  return useQuery({ queryKey: ["dispatch", date], queryFn: () => listDispatch(date) });
}

export function useSubmitCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CompletionSubmit }) =>
      submitCompletion(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatch"] }),
  });
}

export function useAbandonBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => abandonBooking(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatch"] }),
  });
}
