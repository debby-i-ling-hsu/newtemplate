import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { SLOTS } from "@/lib/format";
import { useSchedule, usePutSchedule } from "../hooks";

function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

export function SchedulePage() {
  const month = nextMonth();
  const { data, isLoading } = useSchedule(month);
  const put = usePutSchedule();
  const [slots, setSlots] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data) setSlots(data.slots ?? {});
  }, [data]);

  if (isLoading) return <Spinner />;

  const days = [1, 2, 3, 4, 5, 6, 7];

  function toggle(key: string) {
    setSlots((prev) => ({ ...prev, [key]: prev[key] === false ? true : prev[key] ? false : false }));
  }

  async function submit() {
    try {
      await put.mutateAsync({ month, slots, submitted: true });
      toast.success("班表已提交");
    } catch {
      toast.error("提交失敗");
    }
  }

  return (
    <div>
      <PageTitle>{month} 班表</PageTitle>
      <Card className="mb-3 border-amber-200 bg-amber-50 text-sm text-amber-800">
        📅 開放接單時段請逐格設定 · {data?.submitted ? "已提交 ✓" : "尚未提交"}
      </Card>

      <Card className="mb-3">
        <div className="mb-2 text-xs text-slate-400">▣ 開放接單 ▢ 未開放（點格切換）</div>
        <div className="space-y-1.5">
          {days.map((d) => (
            <div key={d} className="grid grid-cols-[44px_repeat(4,1fr)] gap-1.5">
              <div className="py-2 text-center text-[11px] text-slate-500">
                {month.slice(5)}/{d}
              </div>
              {SLOTS.map((_, j) => {
                const key = `${d}-${j}`;
                const open = slots[key] !== false;
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={cn(
                      "rounded-md py-2 text-xs",
                      open ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {open ? "✓" : "–"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Button className="w-full" onClick={submit} disabled={put.isPending}>
        提交班表
      </Button>
      <p className="mt-2 text-center text-xs text-slate-400">未提交班表，本月將不接任何派工。</p>
    </div>
  );
}
