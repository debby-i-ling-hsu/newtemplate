import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useCreateItem } from "@/features/items/hooks";

const schema = z.object({
  name: z.string().min(1, "請輸入項目名稱"),
});

type ItemFormValues = z.infer<typeof schema>;

export function ItemForm() {
  const createItem = useCreateItem();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    defaultValues: { name: "" },
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: ItemFormValues) {
    await createItem.mutateAsync({ name: values.name });
    reset({ name: "" });
  }

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            accessibilityLabel="新增項目"
            error={errors.name?.message}
            label="新增項目"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="例如：確認部署 healthz"
            returnKeyType="done"
            value={value}
          />
        )}
      />
      <Button disabled={createItem.isPending} onPress={handleSubmit(onSubmit)}>
        {createItem.isPending ? <ActivityIndicator color="#ffffff" /> : "新增"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
});
