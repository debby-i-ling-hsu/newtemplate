import { fireEvent, render } from "@testing-library/react-native";

import { Button } from "@/components/Button";

describe("Button", () => {
  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();

    const { getByText } = await render(<Button onPress={onPress}>儲存</Button>);
    fireEvent.press(getByText("儲存"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
