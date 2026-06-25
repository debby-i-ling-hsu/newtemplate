import { StyleSheet, Text, View, type ViewProps } from "react-native";

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

type Tone = "blue" | "green" | "amber" | "red" | "gray";

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: "#eff6ff", fg: "#1d4ed8" },
  green: { bg: "#ecfdf5", fg: "#047857" },
  amber: { bg: "#fffbeb", fg: "#b45309" },
  red: { bg: "#fef2f2", fg: "#b91c1c" },
  gray: { bg: "#f1f5f9", fg: "#475569" },
};

export function Badge({ tone = "gray", label }: { tone?: Tone; label: string }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function statusTone(status: string): Tone {
  if (status === "已完成") return "green";
  if (status === "進行中" || status === "已確認") return "blue";
  if (status === "已取消" || status === "棄單") return "red";
  return "gray";
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 8,
  },
  empty: {
    color: "#94a3b8",
    paddingVertical: 40,
    textAlign: "center",
  },
});
