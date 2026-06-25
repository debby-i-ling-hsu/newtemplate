import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "gray";

const tones: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

// 預約狀態 → 色調
export function statusTone(status: string): Tone {
  if (status === "已完成") return "green";
  if (status === "進行中" || status === "已確認") return "blue";
  if (status === "已取消" || status === "棄單") return "red";
  if (status === "待派工" || status === "待出發") return "gray";
  return "gray";
}
