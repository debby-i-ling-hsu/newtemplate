import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateItem } from "./hooks";

const schema = z.object({
  name: z.string().min(1, "請輸入名稱"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ItemForm() {
  const create = useCreateItem();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", description: "" } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      reset();
      toast.success("已新增");
    } catch {
      toast.error("新增失敗");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input placeholder="要做的事…" aria-label="名稱" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <Button type="submit" disabled={create.isPending}>
        新增
      </Button>
    </form>
  );
}
