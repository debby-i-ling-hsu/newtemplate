import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/hooks";

export function StaffProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { data: me } = useCurrentUser();
  const p = me?.staff_profile;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>個人中心</Text>

      <Card>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{me?.display_name}</Text>
          <Badge tone="blue" label="業務人員" />
        </View>
        <Text style={styles.muted}>電話 {me?.phone}</Text>
      </Card>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statN}>★ {p?.rating ?? "—"}</Text>
          <Text style={styles.muted}>平均評分</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statN}>{p?.status === "online" ? "在線" : (p?.status ?? "—")}</Text>
          <Text style={styles.muted}>狀態</Text>
        </Card>
      </View>

      <SectionTitle>服務區域</SectionTitle>
      <Card>
        {p && p.areas.length > 0 ? (
          <View style={styles.areas}>
            {p.areas.map((a) => (
              <Badge key={a} tone="gray" label={a} />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>尚未設定服務區（請聯絡行政）</Text>
        )}
        <Text style={styles.hint}>服務區域由行政設定，如需調整請聯絡行政。</Text>
      </Card>

      <Button variant="danger" onPress={onLogout}>
        登出
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  nameRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  name: { color: "#0f172a", fontSize: 17, fontWeight: "800" },
  muted: { color: "#64748b", fontSize: 13 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { alignItems: "center", flex: 1 },
  statN: { color: "#1e40af", fontSize: 17, fontWeight: "800" },
  areas: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  hint: { color: "#94a3b8", fontSize: 12, marginTop: 6 },
});
