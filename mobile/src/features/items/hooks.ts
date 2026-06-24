import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createItem, deleteItem, listItems, toggleItem, type Item } from "@/features/items/api";

const itemsKey = ["items"] as const;

export function useItems() {
  return useQuery({
    queryKey: itemsKey,
    queryFn: listItems,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });
}

export function useToggleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Item) => toggleItem(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });
}
