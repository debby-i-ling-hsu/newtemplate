import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/hooks";
import { useBookings } from "@/features/bookings/hooks";
import { md } from "@/lib/format";

const ACTIVE = ["待派工", "已確認", "待出發", "進行中"];

export function HomeScreen({ onBook }: { onBook: (type: "demo" | "package" | "ac") => void }) {
  const { data: me } = useCurrentUser();
  const { data: bookings } = useBookings();

  const upcoming = bookings
    ?.filter((b) => ACTIVE.includes(b.status))
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greet}>{me?.display_name || "您"} 您好</Text>

      {upcoming ? (
        <View style={styles.hero}>
          <Badge tone="blue" label={`${upcoming.service_type_display} · ${upcoming.status}`} />
          <Text style={styles.heroTitle}>
            {md(upcoming.date)} {upcoming.slot}
          </Text>
          <Text style={styles.heroSub}>服務人員：{upcoming.staff_name}</Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <Badge tone="blue" label="免費 · 限新客戶一次" />
          <Text style={styles.heroTitle}>首次體驗 · 免費領取</Text>
          <Text style={styles.heroSub}>專業除蟎服務，免費體驗寶傑的清潔品質</Text>
          <Pressable style={styles.cta} onPress={() => onBook("demo")}>
            <Text style={styles.ctaText}>立即預約</Text>
          </Pressable>
        </View>
      )}

      {me?.customer_profile && me.customer_profile.pkg_remaining > 0 ? (
        <Card style={styles.row}>
          <Text style={styles.rowLabel}>套組剩餘次數</Text>
          <Badge
            tone="blue"
            label={`${me.customer_profile.pkg_remaining} / ${me.customer_profile.pkg_total} 次`}
          />
        </Card>
      ) : null}

      <Tile title="預約套組 / 一般服務" desc="基礎除蟎可加購" onPress={() => onBook("package")} />
      <Tile title="❄️ 預約洗冷氣" desc="分離式 / 窗型專業拆洗" onPress={() => onBook("ac")} />
    </ScrollView>
  );
}

function Tile({ title, desc, onPress }: { title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Text style={styles.tileTitle}>{title} ›</Text>
        <Text style={styles.tileDesc}>{desc}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  greet: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  hero: { backgroundColor: "#1e40af", borderRadius: 14, gap: 6, padding: 16 },
  heroTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  heroSub: { color: "#bfdbfe", fontSize: 13 },
  cta: { backgroundColor: "#ffffff", borderRadius: 10, marginTop: 8, paddingVertical: 11 },
  ctaText: { color: "#1e40af", fontWeight: "700", textAlign: "center" },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: "#475569" },
  tileTitle: { color: "#1e40af", fontSize: 15, fontWeight: "700" },
  tileDesc: { color: "#64748b", fontSize: 13 },
});
