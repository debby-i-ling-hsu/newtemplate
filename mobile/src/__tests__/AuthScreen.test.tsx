import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { AuthScreen } from "@/features/auth/AuthScreen";
import * as authApi from "@/features/auth/api";

jest.mock("@/features/auth/api");

describe("AuthScreen（手機 OTP）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("輸入手機後進入驗證碼步驟，驗證成功後回呼", async () => {
    (authApi.requestOtp as jest.Mock).mockResolvedValue(undefined);
    (authApi.verifyOtp as jest.Mock).mockResolvedValue({ id: 1, role: "customer" });
    const onAuthenticated = jest.fn();

    const screen = await render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.changeText(screen.getByPlaceholderText("例：0912345678"), "0912345678");
    await screen.findByDisplayValue("0912345678");
    fireEvent.press(screen.getByText("發送驗證碼"));

    // 進入驗證碼步驟（requestOtp 已成功）
    const verifyBtn = await screen.findByText("驗證並登入");
    await waitFor(() => expect(authApi.requestOtp).toHaveBeenCalledWith("0912345678"));

    fireEvent.press(verifyBtn);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(authApi.verifyOtp).toHaveBeenCalledWith("0912345678", "000000");
  });
});
