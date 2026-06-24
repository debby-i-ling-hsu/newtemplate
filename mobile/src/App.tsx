import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { logout } from "@/features/auth/api";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { ItemsScreen } from "@/features/items/ItemsScreen";
import { queryClient } from "@/lib/queryClient";
import { tokenStore } from "@/lib/tokens";

function AppContent() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;
    tokenStore.getAccess().then((token) => {
      if (!isMounted) return;
      setHasSession(Boolean(token));
      setIsBootstrapping(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    queryClient.clear();
    setHasSession(false);
  }

  if (isBootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel="啟動中" />
      </View>
    );
  }

  return hasSession ? (
    <ItemsScreen onLogout={handleLogout} />
  ) : (
    <AuthScreen onAuthenticated={() => setHasSession(true)} />
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
  loading: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
  },
});
