import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "./api";
import { useQueryClient } from "@tanstack/react-query";

export function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      await login(form.username, form.password);
      await qc.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch {
      toast.error("註冊失敗，帳號可能已存在或密碼太弱");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-semibold">註冊</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          placeholder="帳號"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          type="password"
          placeholder="密碼"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button type="submit" disabled={loading}>
          註冊
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        已有帳號？<Link className="underline" to="/login">登入</Link>
      </p>
    </div>
  );
}
