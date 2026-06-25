import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { logout } from "@/features/auth/api";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { useCurrentUser } from "@/features/auth/hooks";
import { CustomerApp } from "@/features/bookings/CustomerApp";
import { StaffApp } from "@/features/dispatch/StaffApp";
import { queryClient } from "@/lib/queryClient";
import { tokenStore } from "@/lib/tokens";

function AppContent() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const qc = useQueryClient();
  const { data: me, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    let mounted = true;
    tokenStore.getAccess().then((token) => {
      if (!mounted) return;
      setHasSession(Boolean(token));
      setBootstrapping(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    qc.clear();
    setHasSession(false);
  }

  if (bootstrapping) return <Centered />;

  if (!hasSession) {
    return <AuthScreen onAuthenticated={() => setHasSession(true)} />;
  }

  if (isLoading) return <Centered />;
  if (isError || !me) {
    // token 失效：清掉並回登入
    logout();
    return <AuthScreen onAuthenticated={() => setHasSession(true)} />;
  }

  if (me.role === "admin") {
    return (
      <View style={styles.center}>
        <Text style={styles.adminText}>行政人員請改用網頁後台（/admin/）</Text>
      </View>
    );
  }

  return me.role === "technician" ? (
    <StaffApp onLogout={handleLogout} />
  ) : (
    <CustomerApp onLogout={handleLogout} />
  );
}

function Centered() {
  return (
    <View style={styles.center}>
      <ActivityIndicator accessibilityLabel="載入中" />
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AppContent />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  adminText: { color: "#475569", textAlign: "center" },
});
