import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout, type NavItem } from "@/components/AppLayout";
import { DispatchPage } from "./pages/DispatchPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { CompletionPage } from "./pages/CompletionPage";
import { SchedulePage } from "./pages/SchedulePage";
import { StaffProfilePage } from "./pages/StaffProfilePage";

const NAV: NavItem[] = [
  { to: "/", label: "派工", icon: "▤", end: true },
  { to: "/schedule", label: "班表", icon: "▦" },
  { to: "/me", label: "個人", icon: "◔" },
];

export function StaffApp({ onLogout }: { onLogout: () => void }) {
  return (
    <AppLayout title="寶傑業務" nav={NAV} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<DispatchPage />} />
        <Route path="/booking/:id" element={<BookingDetailPage />} />
        <Route path="/completion/:id" element={<CompletionPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/me" element={<StaffProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
