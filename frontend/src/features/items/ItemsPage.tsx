import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemForm } from "./ItemForm";
import { useDeleteItem, useItems, useToggleItem } from "./hooks";

export function ItemsPage() {
  const { data: items, isLoading, isError } = useItems();
  const toggle = useToggleItem();
  const remove = useDeleteItem();

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="mb-6 text-2xl font-semibold">我的清單</h1>
      <div className="mb-6">
        <ItemForm />
      </div>

      {isLoading && <p className="text-slate-500">載入中…</p>}
      {isError && <p className="text-red-600">載入失敗，請重新整理。</p>}

      <ul className="divide-y rounded-md border bg-white">
        {items?.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={item.is_done}
              onChange={() => toggle.mutate(item)}
              aria-label={`完成 ${item.name}`}
            />
            <span className={item.is_done ? "flex-1 text-slate-400 line-through" : "flex-1"}>
              {item.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`刪除 ${item.name}`}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {items?.length === 0 && <li className="px-4 py-6 text-center text-slate-400">尚無項目</li>}
      </ul>
    </div>
  );
}
