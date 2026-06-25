import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { useCurrentUser } from "@/features/auth/useAuth";

export function StaffProfilePage() {
  const { data: me, isLoading } = useCurrentUser();
  if (isLoading || !me) return <Spinner />;
  const p = me.staff_profile;

  return (
    <div>
      <PageTitle>個人中心</PageTitle>
      <Card className="mb-3">
        <div className="flex items-center gap-2">
          <b className="text-lg">{me.display_name}</b>
          <Badge tone="blue">業務人員</Badge>
        </div>
        <div className="mt-1 text-sm text-slate-500">電話 {me.phone}</div>
      </Card>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Stat label="平均評分" value={`★ ${p?.rating ?? "—"}`} />
        <Stat label="狀態" value={p?.status === "online" ? "在線" : (p?.status ?? "—")} />
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold text-slate-700">服務區域</div>
        {p && p.areas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {p.areas.map((a) => (
              <Badge key={a} tone="gray">
                {a}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">尚未設定服務區（請聯絡行政）</p>
        )}
        <p className="mt-2 text-xs text-slate-400">服務區域由行政設定，如需調整請聯絡行政。</p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <div className="text-lg font-bold text-blue-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}
