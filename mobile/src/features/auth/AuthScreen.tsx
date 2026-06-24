import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { login, register } from "@/features/auth/api";

const authSchema = z.object({
  username: z.string().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
  email: z.string(),
});

const registerSchema = authSchema.extend({
  email: z.string().email("請輸入有效 email"),
  password: z.string().min(8, "密碼至少 8 碼"),
});

type AuthMode = "login" | "register";
type AuthFormValues = z.infer<typeof authSchema>;

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    defaultValues: { email: "", password: "", username: "" },
    resolver: zodResolver(authSchema),
  });

  async function onSubmit(values: AuthFormValues) {
    setSubmitError(null);
    try {
      if (mode === "register") {
        const parsed = registerSchema.safeParse(values);
        if (!parsed.success) {
          setSubmitError(parsed.error.issues[0]?.message ?? "註冊資料格式不正確。");
          return;
        }
        await register(parsed.data);
      }
      await login(values.username, values.password);
      onAuthenticated();
    } catch {
      setSubmitError(mode === "login" ? "登入失敗，請確認帳號密碼。" : "註冊失敗，請確認資料。");
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setSubmitError(null);
    reset({ email: "", password: "", username: "" });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View style={styles.panel}>
        <Text style={styles.title}>{mode === "login" ? "登入" : "註冊"}</Text>
        <Text style={styles.subtitle}>使用 Django /api/v1/ 帳號系統</Text>

        <View style={styles.tabs}>
          <Button
            accessibilityLabel="切換到登入"
            variant={mode === "login" ? "primary" : "ghost"}
            onPress={() => switchMode("login")}
          >
            登入
          </Button>
          <Button
            accessibilityLabel="切換到註冊"
            variant={mode === "register" ? "primary" : "ghost"}
            onPress={() => switchMode("register")}
          >
            註冊
          </Button>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                accessibilityLabel="帳號"
                autoComplete="username"
                error={errors.username?.message}
                label="帳號"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {mode === "register" ? (
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  accessibilityLabel="Email"
                  autoComplete="email"
                  error={errors.email?.message}
                  keyboardType="email-address"
                  label="Email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                accessibilityLabel="密碼"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                error={errors.password?.message}
                label="密碼"
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                value={value}
              />
            )}
          />

          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

          <Button disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
            {isSubmitting ? <ActivityIndicator color="#ffffff" /> : mode === "login" ? "登入" : "建立帳號"}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  panel: {
    gap: 18,
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  form: {
    gap: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
});
