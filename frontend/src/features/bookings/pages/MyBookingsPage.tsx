import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTitle, Spinner, EmptyState } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { md } from "@/lib/format";
import { useBookings, useCancelBooking } from "../hooks";

const TABS = [
  { key: "up", label: "即將到來", match: ["待派工", "已確認", "待出發"] },
  { key: "ing", label: "進行中", match: ["進行中"] },
  { key: "done", label: "已完成", match: ["已完成", "已取消", "棄單"] },
];

export function MyBookingsPage() {
  const [tab, setTab] = useState("up");
  const { data: bookings, isLoading } = useBookings();
  const cancel = useCancelBooking();

  const active = TABS.find((t) => t.key === tab)!;
  const list = bookings
    ?.filter((b) => active.match.includes(b.status))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  async function onCancel(id: number) {
    try {
      await cancel.mutateAsync(id);
      toast.success("已取消預約");
    } catch {
      toast.error("取消失敗");
    }
  }

  return (
    <div>
      <PageTitle>我的預約</PageTitle>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              tab === t.key ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !list || list.length === 0 ? (
        <EmptyState text="此分類沒有預約" />
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{b.service_type_display}</Badge>
                <Badge tone={statusTone(b.status)}>{b.status}</Badge>
              </div>
              <div className="mt-2 font-bold">
                {md(b.date)} {b.slot}
              </div>
              {b.address && <div className="text-sm text-slate-500">{b.address}</div>}
              <div className="text-sm text-slate-500">業務：{b.staff_name}</div>
              {["待派工", "已確認"].includes(b.status) && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  onClick={() => onCancel(b.id)}
                >
                  取消預約
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
