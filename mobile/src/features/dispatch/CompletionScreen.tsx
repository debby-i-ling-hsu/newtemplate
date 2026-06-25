import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { useSubmitCompletion } from "@/features/dispatch/hooks";

const ITEM_KEYS = ["除蟎-單人床", "除蟎-雙人床", "除蟎-枕頭", "除蟎-沙發", "冷氣清洗"];

export function CompletionScreen({
  bookingId,
  onBack,
  onDone,
}: {
  bookingId: number;
  onBack: () => void;
  onDone: () => void;
}) {
  const submit = useSubmitCompletion();
  const [items, setItems] = useState<Record<string, number>>({ "除蟎-枕頭": 2 });
  const [custNote, setCustNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [signed, setSigned] = useState(false);

  function setItem(key: string, delta: number) {
    setItems((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  }

  async function onSubmit() {
    if (!signed) return Alert.alert("請先取得客戶簽名");
    try {
      const c = await submit.mutateAsync({
        id: bookingId,
        payload: { hours: 1.5, items, cust_note: custNote, internal_note: internalNote, signed },
      });
      Alert.alert("完工已送出！", c.fee ? `車馬費 NT$ ${c.fee}` : "Demo 無車馬費");
      onDone();
    } catch {
      Alert.alert("送出失敗");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Button variant="ghost" onPress={onBack}>
        ‹ 返回
      </Button>
      <Text style={styles.title}>完工回報</Text>

      <SectionTitle>服務項目</SectionTitle>
      <Card>
        {ITEM_KEYS.map((k) => (
          <View key={k} style={styles.itemRow}>
            <Text style={styles.itemLabel}>{k}</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setItem(k, -1)}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.count}>{items[k] || 0}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setItem(k, 1)}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle>客戶簽名</SectionTitle>
      <Pressable onPress={() => setSigned((s) => !s)}>
        <Card style={styles.signBox}>
          <Text style={signed ? styles.signed : styles.muted}>
            {signed ? "✓ 已簽名" : "請客戶在此觸控簽名"}
          </Text>
        </Card>
      </Pressable>

      <SectionTitle>服務備註（客戶可見）</SectionTitle>
      <Card>
        <TextInput
          style={styles.input}
          value={custNote}
          onChangeText={setCustNote}
          placeholder="備註將顯示在客戶服務紀錄中"
          placeholderTextColor="#94a3b8"
          multiline
        />
      </Card>

      <SectionTitle>內部記錄（客戶看不到）</SectionTitle>
      <Card>
        <TextInput
          style={styles.input}
          value={internalNote}
          onChangeText={setInternalNote}
          placeholder="僅業務與行政可見"
          placeholderTextColor="#94a3b8"
          multiline
        />
      </Card>

      <Button variant="secondary" disabled={submit.isPending} onPress={onSubmit}>
        提交完工回報
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 16, paddingBottom: 40 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  itemRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemLabel: { color: "#0f172a" },
  stepper: { alignItems: "center", flexDirection: "row", gap: 12 },
  stepBtn: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepText: { color: "#ffffff", fontSize: 18 },
  count: { color: "#0f172a", fontWeight: "700", minWidth: 16, textAlign: "center" },
  signBox: { alignItems: "center", borderStyle: "dashed", paddingVertical: 22 },
  signed: { color: "#047857", fontWeight: "700" },
  muted: { color: "#94a3b8" },
  input: { color: "#0f172a", fontSize: 15, minHeight: 44, paddingVertical: 4 },
});
