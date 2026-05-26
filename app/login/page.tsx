"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { findUser } from "@/lib/users-store";

export default function LoginPage() {
  const router =
    useRouter();

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
      const user =
        await findUser(
          login,
          password
        );

      if (!user) {
        setError(
          "Login ou senha inválidos."
        );

        setLoading(false);

        return;
      }

      localStorage.setItem(
        "cs_session_user",
        JSON.stringify(user)
      );

      window.location.href =
        "/dashboard";
    } catch (error) {
      console.error(
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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            Entrar no CS
            Inteligente
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={
              handleLogin
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="login">
                Login
              </Label>

              <Input
                id="login"
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
              <Label htmlFor="password">
                Senha
              </Label>

              <Input
                id="password"
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
              <p className="text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Entrando..."
                : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}