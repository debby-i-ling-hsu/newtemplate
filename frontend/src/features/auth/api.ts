import { api } from "@/lib/api";
import { tokenStore } from "@/lib/tokens";

export type Role = "customer" | "technician" | "admin";

export interface CustomerProfile {
  city: string;
  dist: string;
  addr: string;
  full_address: string;
  pkg_remaining: number;
  pkg_total: number;
  has_pets: boolean;
  has_baby: boolean;
  allergy: string;
  notify_push: boolean;
  notify_sms: boolean;
  onboarded: boolean;
}

export interface StaffProfile {
  rating: string;
  status: string;
  areas: string[];
}

export interface User {
  id: number;
  phone: string;
  role: Role;
  display_name: string;
  email: string;
  date_joined: string;
  customer_profile: CustomerProfile | null;
  staff_profile: StaffProfile | null;
}

export async function requestOtp(phone: string): Promise<void> {
  await api.post("/accounts/otp/request/", { phone });
}

export async function verifyOtp(phone: string, code: string, displayName?: string): Promise<User> {
  const resp = await api.post("/accounts/otp/verify/", {
    phone,
    code,
    display_name: displayName,
  });
  tokenStore.set(resp.data.access, resp.data.refresh);
  return resp.data.user as User;
}

export async function fetchMe(): Promise<User> {
  const resp = await api.get<User>("/accounts/me/");
  return resp.data;
}

export interface MeUpdate {
  display_name?: string;
  city?: string;
  dist?: string;
  addr?: string;
  has_pets?: boolean;
  has_baby?: boolean;
  allergy?: string;
  notify_push?: boolean;
  notify_sms?: boolean;
  onboarded?: boolean;
}

export async function updateMe(payload: MeUpdate): Promise<User> {
  const resp = await api.patch<User>("/accounts/me/", payload);
  return resp.data;
}

export function logout(): void {
  tokenStore.clear();
}
