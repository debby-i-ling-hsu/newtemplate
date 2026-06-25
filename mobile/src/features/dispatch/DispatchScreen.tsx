import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card, Empty, statusTone } from "@/components/ui";
import { useDispatch } from "@/features/dispatch/hooks";

function shiftDate(iso: string, delta: number) {
  const d = new Date(iso + "T00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function DispatchScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: list } = useDispatch(date);

  const done = list?.filter((b) => b.status === "已完成").length ?? 0;
  const waiting = list?.filter((b) => ["已確認", "待出發"].includes(b.status)).length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>今日派工</Text>

      <Card style={styles.dateRow}>
        <Pressable onPress={() => setDate(shiftDate(date, -1))}>
          <Text style={styles.link}>‹ 前一天</Text>
        </Pressable>
        <Text style={styles.bold}>{date}</Text>
        <Pressable onPress={() => setDate(shiftDate(date, 1))}>
          <Text style={styles.link}>後一天 ›</Text>
        </Pressable>
      </Card>

      <View style={styles.stats}>
        <Stat n={list?.length ?? 0} label="當日派工" />
        <Stat n={waiting} label="待服務" />
        <Stat n={done} label="已完成" />
      </View>

      {!list || list.length === 0 ? (
        <Empty text="這天沒有派工，好好休息！" />
      ) : (
        list.map((b, i) => (
          <Pressable key={b.id} onPress={() => onOpen(b.id)}>
            <Card>
              <View style={styles.spread}>
                <Badge tone="amber" label={`第 ${i + 1}/${list.length} 場`} />
                <Text style={styles.bold}>{b.slot}</Text>
                <Badge tone={statusTone(b.status)} label={b.status} />
              </View>
              <Text style={styles.muted}>
                📍 {b.address || "—"} · {b.service_type_display}
              </Text>
              <Text style={styles.muted}>👤 {b.customer_name}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.muted}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  dateRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  link: { color: "#1d4ed8" },
  bold: { color: "#0f172a", fontWeight: "700" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { alignItems: "center", flex: 1 },
  statN: { color: "#1e40af", fontSize: 20, fontWeight: "800" },
  spread: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  muted: { color: "#64748b", fontSize: 13 },
});
