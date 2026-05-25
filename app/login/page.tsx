"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isLocalAdmin } from "@/lib/admin-auth";
import { findLocalUser } from "@/lib/local-users-store";
import { createClient } from "@/lib/supabase-browser";

function loginToEmail(value: string) {
  const clean = value.trim();
  if (clean.toLowerCase() === "gabriel martins") return "gabriel.martins@cs-inteligente.local";
  if (clean.includes("@")) return clean;
  return `${clean.toLowerCase().replaceAll(" ", ".")}@cs-inteligente.local`;
}

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (isLocalAdmin(login, password)) {
      const response = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
      });

      if (response.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
    }

    const localUser = findLocalUser(login, password);
    if (localUser) {
      const response = await fetch("/api/auth/local-user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true })
      });

      if (response.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
    }

    const supabase = createClient();
    const authEmail = loginToEmail(login);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password
    });

    if (signInError) {
      setError("Login ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar no CS Inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
