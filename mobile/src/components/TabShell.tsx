import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

/** 真實 App 版面：頂部標題列 + 內容 + 底部 tab bar（自製輕量導覽）。 */
export function TabShell({
  title,
  tabs,
  active,
  onChange,
  children,
}: {
  title: string;
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>寶</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
      <View style={styles.tabbar}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => onChange(t.key)}>
            <Text style={[styles.icon, active === t.key && styles.activeText]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, active === t.key && styles.activeText]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#f1f5f9", flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#1e40af",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  logoText: { color: "#ffffff", fontWeight: "800" },
  title: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  body: { flex: 1 },
  tabbar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  tab: { alignItems: "center", flex: 1, gap: 2, paddingVertical: 8 },
  icon: { color: "#94a3b8", fontSize: 18 },
  tabLabel: { color: "#94a3b8", fontSize: 11 },
  activeText: { color: "#1d4ed8" },
});
