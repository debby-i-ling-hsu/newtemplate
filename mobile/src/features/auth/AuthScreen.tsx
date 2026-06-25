import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { requestOtp, verifyOtp } from "@/features/auth/api";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("000000");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!phone.trim()) {
      setError("請輸入手機號碼");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setStep("code");
    } catch {
      setError("發送失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
      onAuthenticated();
    } catch {
      setError("驗證碼錯誤。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View style={styles.panel}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>寶</Text>
        </View>
        <Text style={styles.title}>寶傑淨化科技</Text>
        <Text style={styles.subtitle}>
          {step === "phone" ? "手機號碼登入 / 註冊" : `驗證碼已發送至 ${phone}`}
        </Text>

        {step === "phone" ? (
          <View style={styles.form}>
            <TextField
              accessibilityLabel="手機號碼"
              keyboardType="phone-pad"
              label="手機號碼"
              onChangeText={setPhone}
              placeholder="例：0912345678"
              value={phone}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={loading} onPress={sendOtp}>
              {loading ? <ActivityIndicator color="#ffffff" /> : "發送驗證碼"}
            </Button>
            <Text style={styles.hint}>新號碼會自動註冊為客戶；業務 / 行政由後台開通</Text>
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              accessibilityLabel="驗證碼"
              keyboardType="number-pad"
              label="驗證碼（測試固定 000000）"
              onChangeText={setCode}
              value={code}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button disabled={loading} onPress={verify}>
              {loading ? <ActivityIndicator color="#ffffff" /> : "驗證並登入"}
            </Button>
            <Button variant="ghost" onPress={() => setStep("phone")}>
              重新輸入手機號碼
            </Button>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f1f5f9",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  panel: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
  },
  title: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    marginBottom: 6,
  },
  form: {
    alignSelf: "stretch",
    gap: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
  hint: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
  },
});
