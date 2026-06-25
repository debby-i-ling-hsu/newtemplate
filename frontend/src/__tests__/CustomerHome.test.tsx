import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomePage } from "@/features/bookings/pages/HomePage";
import { tokenStore } from "@/lib/tokens";

describe("客戶首頁", () => {
  beforeEach(() => {
    tokenStore.set("fake-access", "fake-refresh");
  });

  it("顯示問候語與即將到來的預約", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/您好/)).toBeInTheDocument();
    // 來自 MSW 的即將到來預約
    expect(await screen.findByText(/陳業務/)).toBeInTheDocument();
  });
});
