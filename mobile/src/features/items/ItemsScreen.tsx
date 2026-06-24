import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { useCurrentUser } from "@/features/auth/hooks";
import { ItemForm } from "@/features/items/ItemForm";
import { useDeleteItem, useItems, useToggleItem } from "@/features/items/hooks";
import type { Item } from "@/features/items/api";

interface ItemsScreenProps {
  onLogout: () => void;
}

export function ItemsScreen({ onLogout }: ItemsScreenProps) {
  const { data: user } = useCurrentUser();
  const { data: items, isError, isLoading, refetch } = useItems();
  const toggle = useToggleItem();
  const remove = useDeleteItem();

  function renderItem({ item }: { item: Item }) {
    return (
      <View style={styles.item}>
        <Switch
          accessibilityLabel={`完成 ${item.name}`}
          onValueChange={() => toggle.mutate(item)}
          value={item.is_done}
        />
        <Text style={[styles.itemName, item.is_done && styles.done]}>{item.name}</Text>
        <Button accessibilityLabel={`刪除 ${item.name}`} variant="danger" onPress={() => remove.mutate(item.id)}>
          刪除
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>我的清單</Text>
          <Text style={styles.subtitle}>{user ? `登入者：${user.display_name || user.username}` : "已登入"}</Text>
        </View>
        <Button variant="ghost" onPress={onLogout}>
          登出
        </Button>
      </View>

      <ItemForm />

      {isLoading ? <ActivityIndicator accessibilityLabel="載入中" style={styles.loader} /> : null}
      {isError ? (
        <View style={styles.empty}>
          <Text style={styles.error}>載入失敗，請確認 API 位址或重新整理。</Text>
          <Button variant="secondary" onPress={() => refetch()}>
            重試
          </Button>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={items ?? []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isLoading && !isError ? <Text style={styles.emptyText}>尚無項目</Text> : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f8fafc",
    flex: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    marginTop: 2,
  },
  loader: {
    marginTop: 24,
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  item: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    padding: 12,
  },
  itemName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
  },
  done: {
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  empty: {
    gap: 10,
  },
  emptyText: {
    color: "#64748b",
    paddingTop: 20,
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
  },
});
