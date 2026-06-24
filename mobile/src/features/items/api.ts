import { api } from "@/lib/api";

export interface Item {
  id: number;
  name: string;
  description: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export async function listItems(): Promise<Item[]> {
  const resp = await api.get<Paginated<Item>>("/items/");
  return resp.data.results;
}

export async function createItem(input: { name: string; description?: string }): Promise<Item> {
  const resp = await api.post<Item>("/items/", input);
  return resp.data;
}

export async function toggleItem(item: Item): Promise<Item> {
  const resp = await api.patch<Item>(`/items/${item.id}/`, { is_done: !item.is_done });
  return resp.data;
}

export async function deleteItem(id: number): Promise<void> {
  await api.delete(`/items/${id}/`);
}
