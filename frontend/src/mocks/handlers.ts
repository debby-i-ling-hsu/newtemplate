import { http, HttpResponse } from "msw";

// 測試用的記憶體假資料
let items = [
  {
    id: 1,
    name: "範例項目",
    description: "",
    is_done: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];
let nextId = 2;

export const handlers = [
  http.get("/api/v1/items/", () =>
    HttpResponse.json({ count: items.length, results: items }),
  ),
  http.post("/api/v1/items/", async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    const item = {
      id: nextId++,
      name: body.name,
      description: body.description ?? "",
      is_done: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    items = [item, ...items];
    return HttpResponse.json(item, { status: 201 });
  }),
];

export function resetItems() {
  items = [];
  nextId = 2;
}

// ── 寶傑淨化科技：客戶 / 業務流程的測試假資料 ──────────────────
const customerMe = {
  id: 1,
  phone: "0912345678",
  role: "customer",
  display_name: "王小明",
  email: "",
  date_joined: "2026-01-01T00:00:00Z",
  customer_profile: {
    city: "台中市",
    dist: "西屯區",
    addr: "文心路100號",
    full_address: "台中市西屯區文心路100號",
    pkg_remaining: 5,
    pkg_total: 8,
    has_pets: false,
    has_baby: false,
    allergy: "",
    notify_push: true,
    notify_sms: true,
    onboarded: true,
  },
  staff_profile: null,
};

const baojayBookings = [
  {
    id: 10,
    service_type: "demo",
    service_type_display: "免費體驗",
    date: "2026-07-01",
    slot: "09:00-12:00",
    status: "已確認",
    address: "台中市西屯區文心路100號",
    has_pets: false,
    has_baby: false,
    note: "",
    ac_type: "",
    units: 0,
    price: 0,
    auto_assigned: true,
    staff_name: "陳業務",
    customer_name: "王小明",
    customer_phone: "0912345678",
    has_completion: false,
    created_at: "2026-06-20T00:00:00Z",
  },
];

export const baojayHandlers = [
  http.get("/api/v1/accounts/me/", () => HttpResponse.json(customerMe)),
  http.get("/api/v1/bookings/bookings/", () =>
    HttpResponse.json({ count: baojayBookings.length, results: baojayBookings }),
  ),
  http.get("/api/v1/catalog/services/", () => HttpResponse.json({ count: 0, results: [] })),
  http.get("/api/v1/catalog/packages/", () => HttpResponse.json({ count: 0, results: [] })),
  http.get("/api/v1/bookings/completions/", () => HttpResponse.json({ count: 0, results: [] })),
  http.get("/api/v1/bookings/compensations/", () => HttpResponse.json({ count: 0, results: [] })),
];

handlers.push(...baojayHandlers);
