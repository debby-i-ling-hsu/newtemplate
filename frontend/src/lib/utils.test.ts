import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("合併 class 並讓後者覆寫衝突的 tailwind 類別", () => {
    const hidden = false;
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", hidden && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});
