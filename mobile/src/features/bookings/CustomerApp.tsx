import { useState } from "react";

import { TabShell, type TabDef } from "@/components/TabShell";
import { useCurrentUser } from "@/features/auth/hooks";
import { BookingFlowScreen } from "@/features/bookings/BookingFlowScreen";
import { HistoryScreen } from "@/features/bookings/HistoryScreen";
import { HomeScreen } from "@/features/bookings/HomeScreen";
import { MyBookingsScreen } from "@/features/bookings/MyBookingsScreen";
import { OnboardingScreen } from "@/features/bookings/OnboardingScreen";
import { ProfileScreen } from "@/features/bookings/ProfileScreen";

const TABS: TabDef[] = [
  { key: "home", label: "首頁", icon: "⌂" },
  { key: "bookings", label: "我的預約", icon: "▦" },
  { key: "history", label: "服務紀錄", icon: "📋" },
  { key: "profile", label: "個人", icon: "◔" },
];

type BookType = "demo" | "package" | "ac";

export function CustomerApp({ onLogout }: { onLogout: () => void }) {
  const { data: me } = useCurrentUser();
  const [tab, setTab] = useState("home");
  const [flow, setFlow] = useState<BookType | null>(null);

  if (me && me.customer_profile && !me.customer_profile.onboarded) {
    return <OnboardingScreen />;
  }

  // 下單流程以全螢幕覆蓋呈現（自製 stack push）
  if (flow) {
    return <BookingFlowScreen type={flow} onDone={() => setFlow(null)} />;
  }

  return (
    <TabShell title="寶傑淨化科技" tabs={TABS} active={tab} onChange={setTab}>
      {tab === "home" && <HomeScreen onBook={(t) => setFlow(t)} />}
      {tab === "bookings" && <MyBookingsScreen />}
      {tab === "history" && <HistoryScreen />}
      {tab === "profile" && <ProfileScreen onLogout={onLogout} />}
    </TabShell>
  );
}
