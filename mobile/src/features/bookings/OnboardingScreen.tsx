import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { Card } from "@/components/ui";
import { useUpdateMe } from "@/features/auth/hooks";

export function OnboardingScreen() {
  const update = useUpdateMe();
  const [form, setForm] = useState({ display_name: "", city: "台中市", dist: "", addr: "" });

  async function submit() {
    if (!form.display_name || !form.dist || !form.addr) {
      return Alert.alert("請填寫姓名與完整地址");
    }
    try {
      await update.mutateAsync({ ...form, onboarded: true });
    } catch {
      Alert.alert("儲存失敗，請稍後再試");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>歡迎加入寶傑淨化</Text>
        <Text style={styles.sub}>請填寫基本資料，以便為您安排到府服務</Text>
      </View>
      <Card style={styles.form}>
        <TextField
          label="姓名 *"
          value={form.display_name}
          onChangeText={(v) => setForm({ ...form, display_name: v })}
          placeholder="例：陳小明"
        />
        <TextField
          label="縣市 *"
          value={form.city}
          onChangeText={(v) => setForm({ ...form, city: v })}
        />
        <TextField
          label="行政區 *"
          value={form.dist}
          onChangeText={(v) => setForm({ ...form, dist: v })}
          placeholder="例：西屯區"
        />
        <TextField
          label="詳細地址 *"
          value={form.addr}
          onChangeText={(v) => setForm({ ...form, addr: v })}
          placeholder="例：文心路三段100號"
        />
        <Button disabled={update.isPending} onPress={submit}>
          開始使用
        </Button>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, padding: 20 },
  header: { alignItems: "center", gap: 4, marginTop: 20 },
  emoji: { fontSize: 36 },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "800" },
  sub: { color: "#64748b", fontSize: 14 },
  form: { gap: 12 },
});
