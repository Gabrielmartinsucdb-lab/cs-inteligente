"use client";

import { useState } from "react";
import { LockKeyhole, LogIn, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [login, setLogin] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);

    setError("");

    try {
      console.log(
        "INICIANDO LOGIN..."
      );

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            login,
            password
          })
        }
      );

      const result = (await response.json()) as {
        user?: unknown;
        error?: string;
      };

      console.log(
        "RESULTADO LOGIN:",
        result
      );

      if (!response.ok || !result.user) {
        setError(
          result.error ??
            "Login ou senha inválidos."
        );

        setLoading(false);

        return;
      }

      localStorage.setItem(
        "cs_session_user",
        JSON.stringify(result.user)
      );

      console.log(
        "LOGIN OK"
      );

      window.location.assign(
        "/dashboard"
      );
    } catch (error) {
      console.error(
        "ERRO LOGIN:",
        error
      );

      setError(
        "Erro ao realizar login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_26rem),linear-gradient(135deg,#020617,#111827_55%,#020617)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_440px]">
        <section className="relative flex items-center overflow-hidden px-6 py-12 lg:px-16">
          <div className="absolute left-10 top-10 h-36 w-36 rounded-full border border-white/10" />
          <div className="absolute bottom-12 right-16 h-52 w-52 rounded-full border border-white/10" />
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              Operações internas
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              CS Inteligente
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Acesse o painel para acompanhar alunos,
              mentorias, aulas, templates e indicadores
              do time de CS em um só lugar.
            </p>

            <div className="mt-10 grid gap-3 text-sm font-semibold text-slate-200 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                Dashboard
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                Alunos
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                Aulas
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-4 py-10 text-slate-950 lg:px-8">
          <Card className="w-full max-w-md border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <CardHeader className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-xl">
                  Entrar no painel
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Informe suas credenciais para continuar.
                </p>
              </div>
            </CardHeader>

            <CardContent>
          <form
            onSubmit={
              handleLogin
            }
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label>
                Login
              </Label>

              <Input
                value={login}
                onChange={(
                  event
                ) =>
                  setLogin(
                    event.target
                      .value
                  )
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Senha
              </Label>

              <Input
                type="password"
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                required
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={loading}
            >
              <LogIn className="h-4 w-4" />
              {loading
                ? "Entrando..."
                : "Entrar"}
            </Button>
          </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
