import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CITIES, DISTRICTS } from "@/lib/format";
import { useUpdateMe } from "@/features/auth/useAuth";

export function OnboardingPage() {
  const navigate = useNavigate();
  const update = useUpdateMe();
  const [form, setForm] = useState({ display_name: "", city: "台中市", dist: "", addr: "" });

  async function submit() {
    if (!form.display_name || !form.city || !form.dist || !form.addr) {
      return toast.error("請填寫姓名與完整地址");
    }
    try {
      await update.mutateAsync({ ...form, onboarded: true });
      toast.success(`歡迎，${form.display_name}！`);
      navigate("/", { replace: true });
    } catch {
      toast.error("儲存失敗，請稍後再試");
    }
  }

  return (
    <div className="container max-w-md py-10">
      <div className="mb-6 text-center">
        <div className="text-4xl">👋</div>
        <h1 className="mt-2 text-xl font-bold">歡迎加入寶傑淨化</h1>
        <p className="text-sm text-slate-500">請填寫基本資料，以便為您安排到府服務</p>
      </div>
      <Card className="space-y-3">
        <Field label="姓名 *">
          <Input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="例：陳小明"
          />
        </Field>
        <Field label="服務地址 *">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select value={form.dist} onChange={(e) => setForm({ ...form, dist: e.target.value })}>
              <option value="">選擇行政區</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </div>
          <Input
            value={form.addr}
            onChange={(e) => setForm({ ...form, addr: e.target.value })}
            placeholder="例：文心路三段100號"
          />
        </Field>
        <Button className="w-full" onClick={submit} disabled={update.isPending}>
          開始使用
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-600">{label}</label>
      {children}
    </div>
  );
}
