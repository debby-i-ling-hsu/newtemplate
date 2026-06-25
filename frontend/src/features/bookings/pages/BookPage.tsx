import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/select";
import { PageTitle, Spinner } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { futureDates, nt, SLOTS } from "@/lib/format";
import { usePackages, useServices, useCreateBooking } from "../hooks";

type BookType = "demo" | "package" | "ac";

const TITLES: Record<BookType, string> = {
  demo: "預約免費體驗",
  package: "預約套組 / 一般服務",
  ac: "預約洗冷氣",
};

const AC_TYPES = [
  { key: "split", name: "分離式冷氣", price: 2500 },
  { key: "window", name: "窗型冷氣", price: 2000 },
];

export function BookPage() {
  const { type } = useParams<{ type: BookType }>();
  const bookType = (type ?? "demo") as BookType;
  const navigate = useNavigate();
  const create = useCreateBooking();
  const { data: services, isLoading } = useServices();
  const { data: packages } = usePackages();

  const [slotSel, setSlotSel] = useState<{ date: string; slot: string } | null>(null);
  const [note, setNote] = useState("");
  const [hasPets, setHasPets] = useState(false);
  const [hasBaby, setHasBaby] = useState(false);
  const [addons, setAddons] = useState<Record<number, number>>({});
  const [acType, setAcType] = useState("split");
  const [units, setUnits] = useState(1);

  const dates = useMemo(() => futureDates(7), []);
  const base = services?.find((s) => s.is_base);
  const addonList = services?.filter((s) => s.is_addon) ?? [];
  const ac = AC_TYPES.find((a) => a.key === acType)!;

  const total = useMemo(() => {
    if (bookType === "ac") return ac.price * units;
    if (bookType === "package" && base) {
      let t = base.price;
      addonList.forEach((a) => (t += (addons[a.id] || 0) * a.price));
      return t;
    }
    return 0;
  }, [bookType, ac, units, base, addonList, addons]);

  if (isLoading) return <Spinner />;

  async function submit() {
    if (!slotSel) return toast.error("請選擇時段");
    try {
      await create.mutateAsync({
        service_type: bookType,
        date: slotSel.date,
        slot: slotSel.slot,
        has_pets: hasPets,
        has_baby: hasBaby,
        note,
        ac_type: bookType === "ac" ? acType : "",
        units: bookType === "ac" ? units : 0,
        price: total,
      });
      toast.success("預約成功！已自動派工");
      navigate("/bookings");
    } catch {
      toast.error("預約失敗，請稍後再試");
    }
  }

  return (
    <div>
      <PageTitle>{TITLES[bookType]}</PageTitle>

      {bookType === "demo" && (
        <Card className="mb-3 text-sm text-slate-600">免費體驗 · 一張床 + 兩個枕頭</Card>
      )}

      {bookType === "package" && base && (
        <>
          {packages && packages.length > 0 && (
            <Card className="mb-3 text-sm text-slate-600">
              可用套組：{packages.map((p) => p.name).join("、")}
            </Card>
          )}
          <SectionTitle>基礎服務</SectionTitle>
          <Card className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{base.name}服務</div>
              <div className="text-sm text-slate-500">{base.desc}（必選）</div>
            </div>
            <b>{nt(base.price)}</b>
          </Card>
          <SectionTitle>加購服務（選填）</SectionTitle>
          <Card className="mb-3 divide-y">
            {addonList.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 first:pt-0">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-slate-500">{nt(a.price)}</div>
                </div>
                <Stepper
                  value={addons[a.id] || 0}
                  onChange={(v) => setAddons({ ...addons, [a.id]: v })}
                />
              </div>
            ))}
          </Card>
        </>
      )}

      {bookType === "ac" && (
        <>
          <SectionTitle>冷氣類型</SectionTitle>
          <Card className="mb-3 grid grid-cols-2 gap-2">
            {AC_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setAcType(t.key)}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  acType === t.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white",
                )}
              >
                {t.name}
                <div className="text-xs opacity-80">{nt(t.price)}/台</div>
              </button>
            ))}
          </Card>
          <SectionTitle>清洗台數</SectionTitle>
          <Card className="mb-3 flex items-center justify-between">
            <span>{ac.name}</span>
            <Stepper value={units} min={1} onChange={setUnits} />
          </Card>
        </>
      )}

      {bookType === "demo" && (
        <Card className="mb-3 space-y-2">
          <Toggle label="🐾 家中有寵物" checked={hasPets} onChange={setHasPets} />
          <Toggle label="👶 家中有嬰幼兒" checked={hasBaby} onChange={setHasBaby} />
        </Card>
      )}

      <SectionTitle>選擇時段</SectionTitle>
      <Card className="mb-3">
        <div className="mb-2 text-xs text-slate-400">▣ 可預約 ▣ 已選</div>
        <div className="space-y-1.5">
          {dates.map((d, di) => (
            <div key={d.iso} className="grid grid-cols-[44px_repeat(4,1fr)] gap-1.5">
              <div className="py-2 text-center text-[10px] text-slate-500">
                {d.md}
                <br />
                {d.weekday}
              </div>
              {SLOTS.map((s) => {
                const full = di === 0 && s === SLOTS[3];
                const on = slotSel?.date === d.iso && slotSel?.slot === s;
                return (
                  <button
                    key={s}
                    disabled={full}
                    onClick={() => setSlotSel({ date: d.iso, slot: s })}
                    className={cn(
                      "rounded-md py-2 text-[10px]",
                      full
                        ? "cursor-not-allowed bg-slate-100 text-slate-300"
                        : on
                          ? "bg-blue-600 text-white"
                          : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {s.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-3">
        <label className="mb-1 block text-sm text-slate-600">備註（選填）</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例：對某些清潔劑過敏…（可留空）"
        />
      </Card>

      {bookType !== "demo" && (
        <Card className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            預估費用 <Badge tone="amber">試算 · 未含金流</Badge>
          </span>
          <b className="text-lg">{nt(total)}</b>
        </Card>
      )}

      <Button className="w-full" disabled={!slotSel || create.isPending} onClick={submit}>
        確認預約
      </Button>
      <p className="mt-2 text-center text-xs text-slate-400">
        系統將自動指派業務，確認後業務會於時段前與您聯絡
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-1 text-sm font-semibold text-slate-700">{children}</div>;
}

function Stepper({
  value,
  min = 0,
  onChange,
}: {
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="h-7 w-7 rounded-full bg-blue-600 text-white disabled:bg-slate-200"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <b className="w-4 text-center">{value}</b>
      <button
        className="h-7 w-7 rounded-full bg-blue-600 text-white"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

export { Stepper, Toggle };
