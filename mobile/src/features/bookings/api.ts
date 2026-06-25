import { api } from "@/lib/api";

interface Paginated<T> {
  count: number;
  results: T[];
}

export interface Service {
  id: number;
  name: string;
  desc: string;
  price: number;
  duration: number;
  is_base: boolean;
  is_addon: boolean;
}

export interface Booking {
  id: number;
  service_type: "demo" | "package" | "ac";
  service_type_display: string;
  date: string;
  slot: string;
  status: string;
  address: string;
  has_pets: boolean;
  has_baby: boolean;
  note: string;
  ac_type: string;
  units: number;
  price: number;
  auto_assigned: boolean;
  staff_name: string;
  customer_name: string;
  customer_phone: string;
  has_completion: boolean;
  created_at: string;
}

export interface Completion {
  id: number;
  booking: number;
  service_type_display: string;
  date: string;
  slot: string;
  staff_name: string;
  hours: string;
  items: Record<string, number>;
  cust_note: string;
  rating: number;
  comment: string;
  fee: number;
  fee_status: string;
  month: string;
  signed: boolean;
}

export interface CreateBookingInput {
  service_type: "demo" | "package" | "ac";
  date: string;
  slot: string;
  has_pets?: boolean;
  has_baby?: boolean;
  note?: string;
  ac_type?: string;
  units?: number;
  price?: number;
}

export async function listServices(): Promise<Service[]> {
  const resp = await api.get<Paginated<Service>>("/catalog/services/");
  return resp.data.results;
}

export async function listBookings(): Promise<Booking[]> {
  const resp = await api.get<Paginated<Booking>>("/bookings/bookings/");
  return resp.data.results;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const resp = await api.post<Booking>("/bookings/bookings/", input);
  return resp.data;
}

export async function cancelBooking(id: number): Promise<Booking> {
  const resp = await api.post<Booking>(`/bookings/bookings/${id}/cancel/`);
  return resp.data;
}

export async function listCompletions(): Promise<Completion[]> {
  const resp = await api.get<Paginated<Completion>>("/bookings/completions/");
  return resp.data.results;
}

export async function rateCompletion(
  id: number,
  rating: number,
  comment: string,
): Promise<Completion> {
  const resp = await api.post<Completion>(`/bookings/completions/${id}/rate/`, { rating, comment });
  return resp.data;
}
