import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { requestOtp, verifyOtp } from "./api";

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("000000");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return toast.error("請輸入手機號碼");
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setStep("code");
      toast.success("驗證碼已發送（測試固定 000000）");
    } catch {
      toast.error("發送失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/", { replace: true });
    } catch {
      toast.error("驗證碼錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-bold text-white">
            寶
          </div>
          <h1 className="mt-3 text-lg font-bold">寶傑淨化科技</h1>
          <p className="text-sm text-slate-500">
            {step === "phone" ? "手機號碼登入 / 註冊" : `驗證碼已發送至 ${phone}`}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-3">
            <Input
              inputMode="tel"
              placeholder="手機號碼，例：0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="手機號碼"
            />
            <Button type="submit" disabled={loading}>
              發送驗證碼
            </Button>
            <p className="text-center text-xs text-slate-400">
              新號碼會自動註冊為客戶；業務 / 行政帳號由後台開通
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3">
            <Input
              inputMode="numeric"
              placeholder="6 位數驗證碼"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="驗證碼"
            />
            <Button type="submit" disabled={loading}>
              驗證並登入
            </Button>
            <button
              type="button"
              className="text-center text-sm text-slate-500 underline"
              onClick={() => setStep("phone")}
            >
              重新輸入手機號碼
            </button>
            <p className="text-center text-xs text-slate-400">測試環境不發簡訊，輸入 000000 即可</p>
          </form>
        )}
      </Card>
    </div>
  );
}
