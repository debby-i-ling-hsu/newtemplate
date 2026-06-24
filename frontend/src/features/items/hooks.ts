import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createItem, deleteItem, listItems, toggleItem, type Item } from "./api";

const KEY = ["items"];

export function useItems() {
  return useQuery({ queryKey: KEY, queryFn: listItems });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Item) => toggleItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
