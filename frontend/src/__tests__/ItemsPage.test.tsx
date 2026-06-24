import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemsPage } from "@/features/items/ItemsPage";
import { renderWithProviders } from "@/test-utils";

describe("ItemsPage", () => {
  it("顯示既有項目並能新增", async () => {
    renderWithProviders(<ItemsPage />);

    // 等初始資料載入
    expect(await screen.findByText("範例項目")).toBeInTheDocument();

    // 新增一筆
    await userEvent.type(screen.getByLabelText("名稱"), "買牛奶");
    await userEvent.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() => expect(screen.getByText("買牛奶")).toBeInTheDocument());
  });
});
