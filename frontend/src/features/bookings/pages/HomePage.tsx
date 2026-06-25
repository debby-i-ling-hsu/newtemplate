import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { useCurrentUser } from "@/features/auth/useAuth";
import { useBookings } from "../hooks";
import { md } from "@/lib/format";

const ACTIVE = ["待派工", "已確認", "待出發", "進行中"];

export function HomePage() {
  const { data: me } = useCurrentUser();
  const { data: bookings, isLoading } = useBookings();

  const upcoming = bookings
    ?.filter((b) => ACTIVE.includes(b.status))
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];

  return (
    <div>
      <PageTitle>{me?.display_name || "您"} 您好</PageTitle>

      {isLoading ? (
        <Spinner />
      ) : upcoming ? (
        <Card className="mb-4 border-none bg-blue-800 text-white">
          <Badge tone="blue" className="bg-white/20 text-white">
            {upcoming.service_type_display} · {upcoming.status}
          </Badge>
          <div className="mt-2 text-lg font-bold">
            {md(upcoming.date)} {upcoming.slot}
          </div>
          <div className="text-sm text-blue-100">服務人員：{upcoming.staff_name}</div>
          <Link to="/bookings" className="mt-2 block text-right text-sm text-blue-100">
            查看我的預約 →
          </Link>
        </Card>
      ) : (
        <Card className="mb-4 border-none bg-blue-800 text-white">
          <Badge tone="blue" className="bg-white/20 text-white">
            免費 · 限新客戶一次
          </Badge>
          <div className="mt-2 text-lg font-bold">首次體驗 · 免費領取</div>
          <p className="text-sm text-blue-100">專業除蟎服務，免費體驗寶傑的清潔品質</p>
          <Link
            to="/book/demo"
            className="mt-3 block rounded-lg bg-white py-2.5 text-center font-semibold text-blue-800"
          >
            立即預約
          </Link>
        </Card>
      )}

      {me?.customer_profile && me.customer_profile.pkg_remaining > 0 && (
        <Card className="mb-3 flex items-center justify-between">
          <span className="text-slate-600">套組剩餘次數</span>
          <Badge tone="blue">
            {me.customer_profile.pkg_remaining} / {me.customer_profile.pkg_total} 次
          </Badge>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <HomeTile to="/book/service" title="預約套組 / 一般服務" desc="基礎除蟎可加購、可指定" />
        <HomeTile to="/book/ac" title="❄️ 預約洗冷氣" desc="分離式 / 窗型專業拆洗，可選台數" />
        <HomeTile to="/history" title="我的服務紀錄" desc="查看歷次完工服務與評分" />
        <HomeTile to="/profile" title="補償服務 / 個人資料" desc="補服務、地址與通知偏好" />
      </div>
    </div>
  );
}

function HomeTile({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <div className="font-semibold text-blue-800">{title} ›</div>
        <div className="mt-1 text-sm text-slate-500">{desc}</div>
      </Card>
    </Link>
  );
}
