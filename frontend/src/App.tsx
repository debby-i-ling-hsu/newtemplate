import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { tokenStore } from "@/lib/tokens";
import { LoginPage } from "@/features/auth/LoginPage";
import { useCurrentUser } from "@/features/auth/useAuth";
import { logout as clearTokens } from "@/features/auth/api";
import { CustomerApp } from "@/features/bookings/CustomerApp";
import { StaffApp } from "@/features/dispatch/StaffApp";

function RoleRouter() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me, isLoading, isError } = useCurrentUser();

  function handleLogout() {
    clearTokens();
    qc.clear();
    navigate("/login", { replace: true });
  }

  if (!tokenStore.getAccess()) return <Navigate to="/login" replace />;
  if (isLoading) {
    return <p className="py-20 text-center text-slate-400">載入中…</p>;
  }
  if (isError || !me) {
    clearTokens();
    return <Navigate to="/login" replace />;
  }

  // 行政人員不使用前台 App，導向 Django Admin 後台
  if (me.role === "admin") {
    window.location.href = "/admin/";
    return null;
  }

  return me.role === "technician" ? (
    <StaffApp onLogout={handleLogout} />
  ) : (
    <CustomerApp onLogout={handleLogout} />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<RoleRouter />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
