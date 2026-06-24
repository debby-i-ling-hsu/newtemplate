import { Navigate } from "react-router-dom";
import { tokenStore } from "@/lib/tokens";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!tokenStore.getAccess()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
