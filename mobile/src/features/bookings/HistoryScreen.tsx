import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Card, Empty } from "@/components/ui";
import { useCompletions, useRateCompletion } from "@/features/bookings/hooks";
import type { Completion } from "@/features/bookings/api";

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function HistoryScreen() {
  const { data: completions } = useCompletions();
  const [rating, setRating] = useState<Completion | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的服務紀錄</Text>
      {!completions || completions.length === 0 ? (
        <Empty text="還沒有服務紀錄" />
      ) : (
        completions.map((c) => (
          <Card key={c.id}>
            <View style={styles.spread}>
              <Text style={styles.bold}>{c.service_type_display}</Text>
              {c.rating ? (
                <Text style={styles.stars}>{stars(c.rating)}</Text>
              ) : (
                <Pressable onPress={() => setRating(c)}>
                  <Text style={styles.link}>前往評分 ›</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.muted}>
              {c.date} {c.slot} · {c.staff_name}
            </Text>
            {c.cust_note ? <Text style={styles.note}>服務備註：{c.cust_note}</Text> : null}
          </Card>
        ))
      )}

      {rating ? <RateModal completion={rating} onClose={() => setRating(null)} /> : null}
    </ScrollView>
  );
}

function RateModal({ completion, onClose }: { completion: Completion; onClose: () => void }) {
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState("");
  const rate = useRateCompletion();

  async function submit() {
    if (!value) return Alert.alert("請點選星等");
    try {
      await rate.mutateAsync({ id: completion.id, rating: value, comment });
      Alert.alert("感謝您的評分！");
      onClose();
    } catch {
      Alert.alert("送出失敗");
    }
  }

  return (
    <Modal transparent animationType="fade">
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>為這次服務評分</Text>
          <Text style={styles.muted}>{completion.staff_name} 師傅完成服務</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setValue(n)}>
                <Text style={n <= value ? styles.starOn : styles.starOff}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="留言（選填）"
            placeholderTextColor="#94a3b8"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <View style={styles.modalBtns}>
            <View style={styles.flex}>
              <Button variant="ghost" onPress={onClose}>
                取消
              </Button>
            </View>
            <View style={styles.flex}>
              <Button disabled={rate.isPending} onPress={submit}>
                送出評分
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  spread: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bold: { color: "#0f172a", fontWeight: "700" },
  stars: { color: "#f59e0b" },
  link: { color: "#1d4ed8" },
  muted: { color: "#64748b", fontSize: 13 },
  note: { color: "#0f172a", fontSize: 13, marginTop: 4 },
  backdrop: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", flex: 1, justifyContent: "center", padding: 20 },
  modalCard: { alignSelf: "stretch", gap: 10 },
  modalTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800", textAlign: "center" },
  starRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  starOn: { color: "#f59e0b", fontSize: 32 },
  starOff: { color: "#cbd5e1", fontSize: 32 },
  input: { borderColor: "#e2e8f0", borderRadius: 8, borderWidth: 1, color: "#0f172a", minHeight: 60, padding: 8 },
  modalBtns: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
});
