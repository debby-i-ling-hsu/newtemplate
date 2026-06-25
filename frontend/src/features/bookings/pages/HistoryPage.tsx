import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/select";
import { PageTitle, Spinner, EmptyState } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useCompletions, useRateCompletion } from "../hooks";
import type { Completion } from "../api";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(value)}
      {"☆".repeat(5 - value)}
    </span>
  );
}

export function HistoryPage() {
  const { data: completions, isLoading } = useCompletions();
  const [rating, setRating] = useState<Completion | null>(null);

  return (
    <div>
      <PageTitle>我的服務紀錄</PageTitle>
      {isLoading ? (
        <Spinner />
      ) : !completions || completions.length === 0 ? (
        <EmptyState icon="📋" text="還沒有服務紀錄" />
      ) : (
        <div className="space-y-3">
          {completions.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <b>{c.service_type_display}</b>
                {c.rating ? (
                  <Stars value={c.rating} />
                ) : (
                  <button
                    className="text-sm text-blue-700 underline"
                    onClick={() => setRating(c)}
                  >
                    前往評分 ›
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {c.date} {c.slot} · {c.staff_name}
              </div>
              {c.cust_note && <div className="mt-1 text-sm">服務備註：{c.cust_note}</div>}
            </Card>
          ))}
        </div>
      )}

      {rating && <RateDialog completion={rating} onClose={() => setRating(null)} />}
    </div>
  );
}

function RateDialog({ completion, onClose }: { completion: Completion; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const rate = useRateCompletion();

  async function submit() {
    if (!stars) return toast.error("請點選星等");
    try {
      await rate.mutateAsync({ id: completion.id, rating: stars, comment });
      toast.success("感謝您的評分！");
      onClose();
    } catch {
      toast.error("送出失敗");
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <h2 className="text-center font-bold">為這次服務評分</h2>
        <p className="mb-3 text-center text-sm text-slate-500">
          {completion.staff_name} 師傅完成服務
        </p>
        <div className="mb-3 text-center text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setStars(n)}
              className={cn(n <= stars ? "text-amber-500" : "text-slate-300")}
            >
              ★
            </button>
          ))}
        </div>
        <Textarea
          placeholder="留言（選填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-3"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" onClick={submit} disabled={rate.isPending}>
            送出評分
          </Button>
        </div>
      </Card>
    </div>
  );
}
