import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
}

export function Button({
  children,
  disabled,
  variant = "primary",
  style,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: "#2563eb",
  },
  secondary: {
    backgroundColor: "#0f766e",
  },
  danger: {
    backgroundColor: "#dc2626",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  ghostLabel: {
    color: "#2563eb",
  },
});
