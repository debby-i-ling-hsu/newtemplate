import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionTitle } from "@/components/ui";
import { useCurrentUser, useUpdateMe } from "@/features/auth/hooks";

export function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { data: me } = useCurrentUser();
  const update = useUpdateMe();
  const p = me?.customer_profile;

  function toggle(key: "has_pets" | "has_baby" | "notify_push" | "notify_sms") {
    if (!p) return;
    update.mutate({ [key]: !p[key] });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>個人資料</Text>

      <Card>
        <Row label="姓名" value={me?.display_name || "—"} />
        <Row label="手機號碼" value={me?.phone || "—"} />
        <Row label="服務地址" value={p?.full_address || "—"} />
        <Row
          label="套組剩餘"
          value={p && p.pkg_remaining > 0 ? `${p.pkg_remaining} / ${p.pkg_total} 次` : "無"}
        />
      </Card>

      <SectionTitle>家庭環境</SectionTitle>
      <Card>
        <ToggleRow label="家中有寵物" value={!!p?.has_pets} onValueChange={() => toggle("has_pets")} />
        <ToggleRow label="家中有嬰幼兒" value={!!p?.has_baby} onValueChange={() => toggle("has_baby")} />
      </Card>

      <SectionTitle>通知偏好</SectionTitle>
      <Card>
        <ToggleRow label="推播通知" value={!!p?.notify_push} onValueChange={() => toggle("notify_push")} />
        <ToggleRow label="簡訊通知" value={!!p?.notify_sms} onValueChange={() => toggle("notify_sms")} />
      </Card>

      <Button variant="danger" onPress={onLogout}>
        登出
      </Button>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.value}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { color: "#64748b" },
  value: { color: "#0f172a", fontWeight: "600" },
});
