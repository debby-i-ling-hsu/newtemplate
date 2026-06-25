import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  abandonBooking,
  getDispatch,
  getSchedule,
  listDispatch,
  putSchedule,
  submitCompletion,
  type CompletionSubmit,
} from "./api";

export function useDispatch(date: string) {
  return useQuery({ queryKey: ["dispatch", date], queryFn: () => listDispatch(date) });
}

export function useDispatchDetail(id: number) {
  return useQuery({ queryKey: ["dispatch-detail", id], queryFn: () => getDispatch(id) });
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

export function useSchedule(month: string) {
  return useQuery({ queryKey: ["schedule", month], queryFn: () => getSchedule(month) });
}

export function usePutSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      month,
      slots,
      submitted,
    }: {
      month: string;
      slots: Record<string, boolean>;
      submitted: boolean;
    }) => putSchedule(month, slots, submitted),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["schedule", v.month] }),
  });
}
