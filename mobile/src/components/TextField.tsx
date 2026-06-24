import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  error?: string;
  label: string;
}

export function TextField({ error, label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor="#94a3b8"
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: "#dc2626",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
  },
});
