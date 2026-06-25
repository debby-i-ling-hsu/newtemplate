import { api } from "@/lib/api";
import type { Booking, Completion } from "@/features/bookings/api";

interface Paginated<T> {
  count: number;
  results: T[];
}

export type { Booking, Completion };

export interface CompletionSubmit {
  hours: number;
  items: Record<string, number>;
  cust_note?: string;
  internal_note?: string;
  signed: boolean;
}

export async function listDispatch(date?: string): Promise<Booking[]> {
  const resp = await api.get<Paginated<Booking>>("/bookings/dispatch/", {
    params: date ? { date } : undefined,
  });
  return resp.data.results;
}

export async function getDispatch(id: number): Promise<Booking> {
  const resp = await api.get<Booking>(`/bookings/dispatch/${id}/`);
  return resp.data;
}

export async function submitCompletion(id: number, payload: CompletionSubmit): Promise<Completion> {
  const resp = await api.post<Completion>(`/bookings/dispatch/${id}/complete/`, payload);
  return resp.data;
}

export async function abandonBooking(id: number, reason: string): Promise<Booking> {
  const resp = await api.post<Booking>(`/bookings/dispatch/${id}/abandon/`, { reason });
  return resp.data;
}

export interface Schedule {
  id: number | null;
  month: string;
  slots: Record<string, boolean>;
  submitted: boolean;
}

export async function getSchedule(month: string): Promise<Schedule> {
  const resp = await api.get<Schedule>("/staffing/schedule/", { params: { month } });
  return resp.data;
}

export async function putSchedule(
  month: string,
  slots: Record<string, boolean>,
  submitted: boolean,
): Promise<Schedule> {
  const resp = await api.put<Schedule>("/staffing/schedule/", { month, slots, submitted });
  return resp.data;
}
