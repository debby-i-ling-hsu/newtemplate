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
