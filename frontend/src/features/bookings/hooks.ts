import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  listBookings,
  listCompensations,
  listCompletions,
  listPackages,
  listServices,
  rateCompletion,
  type CreateBookingInput,
} from "./api";

export function useServices() {
  return useQuery({ queryKey: ["services"], queryFn: listServices });
}

export function usePackages() {
  return useQuery({ queryKey: ["packages"], queryFn: listPackages });
}

export function useBookings() {
  return useQuery({ queryKey: ["bookings"], queryFn: listBookings });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCompletions() {
  return useQuery({ queryKey: ["completions"], queryFn: listCompletions });
}

export function useRateCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: number; rating: number; comment: string }) =>
      rateCompletion(id, rating, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completions"] }),
  });
}

export function useCompensations() {
  return useQuery({ queryKey: ["compensations"], queryFn: listCompensations });
}
