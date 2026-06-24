import { tokenStore } from "@/lib/tokens";

describe("tokenStore", () => {
  it("stores, reads, and clears JWT tokens through SecureStore", async () => {
    await tokenStore.set("access-token", "refresh-token");

    await expect(tokenStore.getAccess()).resolves.toBe("access-token");
    await expect(tokenStore.getRefresh()).resolves.toBe("refresh-token");

    await tokenStore.clear();

    await expect(tokenStore.getAccess()).resolves.toBeNull();
    await expect(tokenStore.getRefresh()).resolves.toBeNull();
  });
});
