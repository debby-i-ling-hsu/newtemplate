import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/select";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useDispatchDetail, useSubmitCompletion } from "../hooks";

const ITEM_KEYS = ["除蟎-單人床", "除蟎-雙人床", "除蟎-枕頭", "除蟎-沙發", "冷氣清洗"];

export function CompletionPage() {
  const { id } = useParams<{ id: string }>();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const { data: b, isLoading } = useDispatchDetail(bookingId);
  const submit = useSubmitCompletion();

  const [items, setItems] = useState<Record<string, number>>({ "除蟎-枕頭": 2 });
  const [hours, setHours] = useState(1.5);
  const [custNote, setCustNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [signed, setSigned] = useState(false);

  if (isLoading || !b) return <Spinner />;

  function setItem(key: string, delta: number) {
    setItems((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  }

  async function onSubmit() {
    if (!signed) return toast.error("請先取得客戶簽名");
    try {
      const c = await submit.mutateAsync({
        id: bookingId,
        payload: { hours, items, cust_note: custNote, internal_note: internalNote, signed },
      });
      toast.success(c.fee ? `完工已送出！車馬費 NT$ ${c.fee}` : "完工已送出！Demo 無車馬費");
      navigate("/");
    } catch {
      toast.error("送出失敗");
    }
  }

  return (
    <div>
      <PageTitle>完工回報</PageTitle>
      <p className="mb-3 text-sm text-slate-500">請確認服務項目、簽名後提交（{b.customer_name}）</p>

      <SectionTitle>服務項目</SectionTitle>
      <Card className="mb-3 divide-y">
        {ITEM_KEYS.map((k) => (
          <div key={k} className="flex items-center justify-between py-2 first:pt-0">
            <span>{k}</span>
            <div className="flex items-center gap-3">
              <button
                className="h-7 w-7 rounded-full bg-blue-600 text-white disabled:bg-slate-200"
                disabled={!items[k]}
                onClick={() => setItem(k, -1)}
              >
                −
              </button>
              <b className="w-4 text-center">{items[k] || 0}</b>
              <button
                className="h-7 w-7 rounded-full bg-blue-600 text-white"
                onClick={() => setItem(k, 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </Card>

      <SectionTitle>客戶簽名</SectionTitle>
      <Card
        className={cn(
          "mb-3 cursor-pointer border-dashed py-6 text-center",
          signed ? "text-emerald-600" : "text-slate-400",
        )}
        onClick={() => setSigned((s) => !s)}
      >
        {signed ? `✓ 已簽名（${b.customer_name}）` : "請客戶在此觸控簽名"}
      </Card>

      <Card className="mb-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">實際服務時數（小時）</label>
          <Select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[1, 1.5, 2, 2.5, 3].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">服務備註（客戶可見）</label>
          <Textarea value={custNote} onChange={(e) => setCustNote(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">內部記錄（客戶看不到）</label>
          <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
        </div>
      </Card>

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-500"
        disabled={submit.isPending}
        onClick={onSubmit}
      >
        提交完工回報
      </Button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-1 text-sm font-semibold text-slate-700">{children}</div>;
}
