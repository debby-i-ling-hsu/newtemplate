import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentUser, useUpdateMe } from "@/features/auth/useAuth";
import { useCompensations } from "../hooks";

export function ProfilePage() {
  const { data: me, isLoading } = useCurrentUser();
  const { data: comps } = useCompensations();
  const update = useUpdateMe();

  if (isLoading || !me) return <Spinner />;
  const p = me.customer_profile;

  async function toggle(key: "has_pets" | "has_baby" | "notify_push" | "notify_sms") {
    if (!p) return;
    try {
      await update.mutateAsync({ [key]: !p[key] });
      toast.success("已更新");
    } catch {
      toast.error("更新失敗");
    }
  }

  return (
    <div>
      <PageTitle>個人資料</PageTitle>

      <Card className="mb-3 space-y-2">
        <Row label="姓名" value={me.display_name || "—"} />
        <Row label="手機號碼" value={me.phone} />
        <Row label="服務地址" value={p?.full_address || "—"} />
        <Row
          label="套組剩餘"
          value={p && p.pkg_remaining > 0 ? `${p.pkg_remaining} / ${p.pkg_total} 次` : "無"}
        />
      </Card>

      <SectionTitle>家庭環境</SectionTitle>
      <Card className="mb-3 space-y-2">
        <ToggleRow label="家中有寵物" checked={!!p?.has_pets} onClick={() => toggle("has_pets")} />
        <ToggleRow label="家中有嬰幼兒" checked={!!p?.has_baby} onClick={() => toggle("has_baby")} />
      </Card>

      <SectionTitle>通知偏好</SectionTitle>
      <Card className="mb-3 space-y-2">
        <ToggleRow label="推播通知" checked={!!p?.notify_push} onClick={() => toggle("notify_push")} />
        <ToggleRow label="簡訊通知" checked={!!p?.notify_sms} onClick={() => toggle("notify_sms")} />
      </Card>

      <SectionTitle>補償服務</SectionTitle>
      {comps && comps.length > 0 ? (
        <div className="space-y-2">
          {comps.map((c) => (
            <Card key={c.id}>
              <Badge tone="green">免費補服務</Badge>
              <div className="mt-1 text-sm">原因：{c.reason}</div>
              <div className="text-xs text-slate-400">取得日：{c.created_at.slice(0, 10)}</div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center text-sm text-slate-400">目前沒有補償服務記錄</Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1 last:border-none">
      <span className="text-slate-500">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-1 text-sm font-semibold text-slate-700">{children}</div>;
}

function ToggleRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <button
        onClick={onClick}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
