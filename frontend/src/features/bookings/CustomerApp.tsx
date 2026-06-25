import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout, type NavItem } from "@/components/AppLayout";
import { useCurrentUser } from "@/features/auth/useAuth";
import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { BookPage } from "./pages/BookPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ProfilePage } from "./pages/ProfilePage";

const NAV: NavItem[] = [
  { to: "/", label: "首頁", icon: "⌂", end: true },
  { to: "/bookings", label: "我的預約", icon: "▦" },
  { to: "/history", label: "服務紀錄", icon: "📋" },
  { to: "/profile", label: "個人", icon: "◔" },
];

export function CustomerApp({ onLogout }: { onLogout: () => void }) {
  const { data: me } = useCurrentUser();

  // 新客戶尚未完成新手引導 → 先導到 onboarding
  if (me && me.customer_profile && !me.customer_profile.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout title="寶傑淨化科技" nav={NAV} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book/:type" element={<BookPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
