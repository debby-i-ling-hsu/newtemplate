import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useAbandonBooking, useDispatchDetail } from "../hooks";

const REASONS = ["突發身體不適", "家庭緊急事故", "交通工具故障", "臨時無法出行", "其他"];

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const { data: b, isLoading } = useDispatchDetail(bookingId);
  const abandon = useAbandonBooking();
  const [showAbandon, setShowAbandon] = useState(false);
  const [reason, setReason] = useState("");

  if (isLoading || !b) return <Spinner />;

  const canAct = ["待出發", "進行中", "已確認"].includes(b.status);

  async function doAbandon() {
    if (!reason) return toast.error("請選擇棄單原因");
    try {
      await abandon.mutateAsync({ id: bookingId, reason });
      toast.success("已棄單，系統推播補單給其他業務");
      navigate("/");
    } catch {
      toast.error("棄單失敗");
    }
  }

  return (
    <div>
      <PageTitle>派工詳情</PageTitle>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <b>{b.slot}</b>
          <Badge tone={statusTone(b.status)}>{b.status}</Badge>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {b.date} · {b.service_type_display}
        </div>
      </Card>

      <Card className="mb-3 space-y-2">
        <Row label="客戶" value={b.customer_name} />
        <Row label="電話" value={b.customer_phone} />
        <Row label="地址" value={b.address || "—"} />
        {(b.has_pets || b.has_baby) && (
          <Row
            label="家中狀況"
            value={[b.has_pets ? "有寵物" : "", b.has_baby ? "有嬰幼兒" : ""]
              .filter(Boolean)
              .join("、")}
          />
        )}
        {b.note && <Row label="備註" value={b.note} />}
      </Card>

      {canAct && !showAbandon && (
        <div className="space-y-2">
          <Link to={`/completion/${b.id}`}>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500">提交完工回報</Button>
          </Link>
          <Button
            variant="outline"
            className="w-full text-red-600"
            onClick={() => setShowAbandon(true)}
          >
            棄單
          </Button>
        </div>
      )}

      {showAbandon && (
        <Card className="border-red-200 bg-red-50">
          <p className="mb-2 text-sm text-red-800">
            棄單後此預約將自動推播給其他業務，並記錄原因。客戶將獲得一次免費補償服務。
          </p>
          <div className="mb-3 space-y-1">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  "block w-full rounded-md border px-3 py-2 text-left text-sm",
                  reason === r ? "border-red-500 bg-white" : "border-slate-200 bg-white",
                )}
              >
                {reason === r ? "◉" : "◯"} {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAbandon(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={abandon.isPending}
              onClick={doAbandon}
            >
              確認棄單
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1 last:border-none">
      <span className="text-slate-500">{label}</span>
      <b className="text-right">{value}</b>
    </div>
  );
}
