import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "./api";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch {
      toast.error("登入失敗，請檢查帳號密碼");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">登入</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input placeholder="帳號" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          登入
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        還沒有帳號？<Link className="underline" to="/register">註冊</Link>
      </p>
    </div>
  );
}
