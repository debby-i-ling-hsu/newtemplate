import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Badge, Card, Empty, statusTone } from "@/components/ui";
import { useBookings, useCancelBooking } from "@/features/bookings/hooks";
import { md } from "@/lib/format";

const TABS = [
  { key: "up", label: "即將到來", match: ["待派工", "已確認", "待出發"] },
  { key: "ing", label: "進行中", match: ["進行中"] },
  { key: "done", label: "已完成", match: ["已完成", "已取消", "棄單"] },
];

export function MyBookingsScreen() {
  const [tab, setTab] = useState("up");
  const { data: bookings } = useBookings();
  const cancel = useCancelBooking();

  const active = TABS.find((t) => t.key === tab)!;
  const list = bookings
    ?.filter((b) => active.match.includes(b.status))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  function onCancel(id: number) {
    Alert.alert("取消預約", "確定要取消嗎？", [
      { text: "返回", style: "cancel" },
      {
        text: "確認取消",
        style: "destructive",
        onPress: async () => {
          await cancel.mutateAsync(id);
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的預約</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabOn]}
          >
            <Text style={tab === t.key ? styles.tabTextOn : styles.tabText}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {!list || list.length === 0 ? (
        <Empty text="此分類沒有預約" />
      ) : (
        list.map((b) => (
          <Card key={b.id}>
            <View style={styles.badges}>
              <Badge tone="blue" label={b.service_type_display} />
              <Badge tone={statusTone(b.status)} label={b.status} />
            </View>
            <Text style={styles.dateline}>
              {md(b.date)} {b.slot}
            </Text>
            {b.address ? <Text style={styles.muted}>{b.address}</Text> : null}
            <Text style={styles.muted}>業務：{b.staff_name}</Text>
            {["待派工", "已確認"].includes(b.status) ? (
              <Button variant="danger" onPress={() => onCancel(b.id)}>
                取消預約
              </Button>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { borderColor: "#cbd5e1", borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  tabOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  tabText: { color: "#475569", fontSize: 13 },
  tabTextOn: { color: "#ffffff", fontSize: 13 },
  badges: { flexDirection: "row", gap: 6 },
  dateline: { color: "#0f172a", fontWeight: "700", marginTop: 4 },
  muted: { color: "#64748b", fontSize: 13 },
});
