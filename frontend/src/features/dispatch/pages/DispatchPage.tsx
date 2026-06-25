import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageTitle, Spinner, EmptyState } from "@/components/AppLayout";
import { useDispatch } from "../hooks";

function shiftDate(iso: string, delta: number) {
  const d = new Date(iso + "T00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function DispatchPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: list, isLoading } = useDispatch(date);

  const done = list?.filter((b) => b.status === "已完成").length ?? 0;
  const waiting = list?.filter((b) => ["已確認", "待出發"].includes(b.status)).length ?? 0;

  return (
    <div>
      <PageTitle>今日派工</PageTitle>

      <Card className="mb-3 flex items-center justify-between">
        <button className="text-sm text-blue-700" onClick={() => setDate(shiftDate(date, -1))}>
          ‹ 前一天
        </button>
        <b>{date}</b>
        <button className="text-sm text-blue-700" onClick={() => setDate(shiftDate(date, 1))}>
          後一天 ›
        </button>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat n={list?.length ?? 0} label="當日派工" />
        <Stat n={waiting} label="待服務" />
        <Stat n={done} label="已完成" />
      </div>

      {isLoading ? (
        <Spinner />
      ) : !list || list.length === 0 ? (
        <EmptyState icon="✅" text="這天沒有派工，好好休息！" />
      ) : (
        <div className="space-y-3">
          {list.map((b, i) => (
            <Link key={b.id} to={`/booking/${b.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <Badge tone="amber">
                    第 {i + 1}/{list.length} 場
                  </Badge>
                  <b>{b.slot}</b>
                  <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  📍 {b.address || "—"} · {b.service_type_display}
                </div>
                <div className="text-sm text-slate-500">👤 {b.customer_name}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Card className="text-center">
      <div className="text-xl font-bold text-blue-800">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}
