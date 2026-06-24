import { api } from "@/lib/api";
import { tokenStore } from "@/lib/tokens";

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  date_joined: string;
}

export async function login(username: string, password: string): Promise<void> {
  const resp = await api.post("/accounts/login/", { username, password });
  await tokenStore.set(resp.data.access, resp.data.refresh);
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
}): Promise<void> {
  await api.post("/accounts/register/", input);
}

export async function fetchMe(): Promise<User> {
  const resp = await api.get<User>("/accounts/me/");
  return resp.data;
}

export function logout(): Promise<void> {
  return tokenStore.clear();
}
