import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Badge, Card, SectionTitle, statusTone } from "@/components/ui";
import { useBookings } from "@/features/bookings/hooks";
import { useDispatch, useAbandonBooking } from "@/features/dispatch/hooks";

const REASONS = ["突發身體不適", "家庭緊急事故", "交通工具故障", "臨時無法出行", "其他"];

export function BookingDetailScreen({
  bookingId,
  date,
  onBack,
  onComplete,
}: {
  bookingId: number;
  date: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { data: list } = useDispatch(date);
  useBookings(); // 保持快取一致
  const abandon = useAbandonBooking();
  const [showAbandon, setShowAbandon] = useState(false);
  const [reason, setReason] = useState("");

  const b = list?.find((x) => x.id === bookingId);
  if (!b) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" onPress={onBack}>
          ‹ 返回
        </Button>
        <Text style={styles.muted}>找不到此派工</Text>
      </ScrollView>
    );
  }

  const canAct = ["待出發", "進行中", "已確認"].includes(b.status);

  async function doAbandon() {
    if (!reason) return Alert.alert("請選擇棄單原因");
    try {
      await abandon.mutateAsync({ id: bookingId, reason });
      Alert.alert("已棄單", "系統推播補單給其他業務");
      onBack();
    } catch {
      Alert.alert("棄單失敗");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Button variant="ghost" onPress={onBack}>
        ‹ 返回派工列表
      </Button>
      <Text style={styles.title}>派工詳情</Text>

      <Card style={styles.spread}>
        <Text style={styles.bold}>{b.slot}</Text>
        <Badge tone={statusTone(b.status)} label={b.status} />
      </Card>

      <Card>
        <Row label="客戶" value={b.customer_name} />
        <Row label="電話" value={b.customer_phone} />
        <Row label="地址" value={b.address || "—"} />
        <Row label="服務類型" value={b.service_type_display} />
        <Row label="服務日期" value={`${b.date} ${b.slot}`} />
        {b.has_pets || b.has_baby ? (
          <Row
            label="家中狀況"
            value={[b.has_pets ? "有寵物" : "", b.has_baby ? "有嬰幼兒" : ""]
              .filter(Boolean)
              .join("、")}
          />
        ) : null}
      </Card>

      {canAct && !showAbandon ? (
        <>
          <Button variant="secondary" onPress={onComplete}>
            提交完工回報
          </Button>
          <Button variant="ghost" onPress={() => setShowAbandon(true)}>
            棄單
          </Button>
        </>
      ) : null}

      {showAbandon ? (
        <Card style={styles.abandonBox}>
          <SectionTitle>棄單原因</SectionTitle>
          <Text style={styles.muted}>
            棄單後此預約將推播給其他業務，並記錄原因。客戶將獲得一次免費補償服務。
          </Text>
          {REASONS.map((r) => (
            <Pressable key={r} onPress={() => setReason(r)} style={styles.reason}>
              <Text style={styles.reasonText}>
                {reason === r ? "◉" : "◯"} {r}
              </Text>
            </Pressable>
          ))}
          <Button variant="ghost" onPress={() => setShowAbandon(false)}>
            取消
          </Button>
          <Button variant="danger" disabled={abandon.isPending} onPress={doAbandon}>
            確認棄單
          </Button>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  spread: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bold: { color: "#0f172a", fontWeight: "700" },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  value: { color: "#0f172a", fontWeight: "600", maxWidth: "65%", textAlign: "right" },
  muted: { color: "#64748b", fontSize: 13 },
  abandonBox: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  reason: { paddingVertical: 8 },
  reasonText: { color: "#0f172a" },
});
