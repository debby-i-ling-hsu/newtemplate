import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { useCreateBooking, useServices } from "@/features/bookings/hooks";
import { futureDates, nt, SLOTS } from "@/lib/format";

type BookType = "demo" | "package" | "ac";
const TITLES: Record<BookType, string> = {
  demo: "預約免費體驗",
  package: "預約套組 / 一般服務",
  ac: "預約洗冷氣",
};
const AC_TYPES = [
  { key: "split", name: "分離式冷氣", price: 2500 },
  { key: "window", name: "窗型冷氣", price: 2000 },
];

export function BookingFlowScreen({ type, onDone }: { type: BookType; onDone: () => void }) {
  const create = useCreateBooking();
  const { data: services } = useServices();
  const dates = useMemo(() => futureDates(7), []);

  const [sel, setSel] = useState<{ date: string; slot: string } | null>(null);
  const [note, setNote] = useState("");
  const [acType, setAcType] = useState("split");
  const [units, setUnits] = useState(1);

  const base = services?.find((s) => s.is_base);
  const ac = AC_TYPES.find((a) => a.key === acType)!;
  const total = type === "ac" ? ac.price * units : type === "package" && base ? base.price : 0;

  async function submit() {
    if (!sel) return Alert.alert("請選擇時段");
    try {
      await create.mutateAsync({
        service_type: type,
        date: sel.date,
        slot: sel.slot,
        note,
        ac_type: type === "ac" ? acType : "",
        units: type === "ac" ? units : 0,
        price: total,
      });
      Alert.alert("預約成功！", "已自動派工");
      onDone();
    } catch {
      Alert.alert("預約失敗，請稍後再試");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{TITLES[type]}</Text>

      {type === "demo" ? (
        <Card>
          <Text style={styles.muted}>免費體驗 · 一張床 + 兩個枕頭</Text>
        </Card>
      ) : null}

      {type === "package" && base ? (
        <Card style={styles.spread}>
          <View>
            <Text style={styles.bold}>{base.name}服務</Text>
            <Text style={styles.muted}>{base.desc}（必選）</Text>
          </View>
          <Text style={styles.bold}>{nt(base.price)}</Text>
        </Card>
      ) : null}

      {type === "ac" ? (
        <>
          <SectionTitle>冷氣類型</SectionTitle>
          <View style={styles.acRow}>
            {AC_TYPES.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setAcType(t.key)}
                style={[styles.acTile, acType === t.key && styles.acTileOn]}
              >
                <Text style={acType === t.key ? styles.acTextOn : styles.acText}>{t.name}</Text>
                <Text style={acType === t.key ? styles.acTextOn : styles.muted}>
                  {nt(t.price)}/台
                </Text>
              </Pressable>
            ))}
          </View>
          <Card style={styles.spread}>
            <Text style={styles.bold}>清洗台數</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setUnits((u) => Math.max(1, u - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.bold}>{units}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setUnits((u) => u + 1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle>選擇時段</SectionTitle>
      <Card>
        {dates.map((d) => (
          <View key={d.iso} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{d.label}</Text>
            <View style={styles.slotRow}>
              {SLOTS.map((s) => {
                const on = sel?.date === d.iso && sel?.slot === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSel({ date: d.iso, slot: s })}
                    style={[styles.slot, on && styles.slotOn]}
                  >
                    <Text style={on ? styles.slotTextOn : styles.slotText}>{s.slice(0, 5)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.muted}>備註（選填）</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="例：對某些清潔劑過敏…"
          placeholderTextColor="#94a3b8"
          multiline
        />
      </Card>

      {type !== "demo" ? (
        <Card style={styles.spread}>
          <View style={styles.feeLabel}>
            <Text style={styles.muted}>預估費用 </Text>
            <Badge tone="amber" label="試算 · 未含金流" />
          </View>
          <Text style={styles.feeTotal}>{nt(total)}</Text>
        </Card>
      ) : null}

      <Button disabled={!sel || create.isPending} onPress={submit}>
        確認預約
      </Button>
      <Button variant="ghost" onPress={onDone}>
        取消
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 16, paddingBottom: 40 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  muted: { color: "#64748b", fontSize: 13 },
  bold: { color: "#0f172a", fontWeight: "700" },
  spread: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  acRow: { flexDirection: "row", gap: 8 },
  acTile: { borderColor: "#cbd5e1", borderRadius: 10, borderWidth: 1, flex: 1, padding: 12 },
  acTileOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  acText: { color: "#0f172a", fontWeight: "700" },
  acTextOn: { color: "#ffffff", fontWeight: "700" },
  stepper: { alignItems: "center", flexDirection: "row", gap: 14 },
  stepBtn: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepBtnText: { color: "#ffffff", fontSize: 18 },
  dayRow: { borderBottomColor: "#f1f5f9", borderBottomWidth: 1, gap: 4, paddingVertical: 6 },
  dayLabel: { color: "#475569", fontSize: 12 },
  slotRow: { flexDirection: "row", gap: 6 },
  slot: { backgroundColor: "#ecfdf5", borderRadius: 8, flex: 1, paddingVertical: 8 },
  slotOn: { backgroundColor: "#2563eb" },
  slotText: { color: "#047857", fontSize: 11, textAlign: "center" },
  slotTextOn: { color: "#ffffff", fontSize: 11, textAlign: "center" },
  input: { color: "#0f172a", fontSize: 15, minHeight: 44, paddingVertical: 6 },
  feeLabel: { alignItems: "center", flexDirection: "row" },
  feeTotal: { color: "#0f172a", fontSize: 17, fontWeight: "800" },
});
