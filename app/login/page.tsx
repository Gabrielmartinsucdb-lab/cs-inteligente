"use client";

import { useState } from "react";

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

      const user =
        await findUser(
          login,
          password
        );

      console.log(
        "RESULTADO LOGIN:",
        user
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

      const sessionResponse = await fetch(
        "/api/auth/local-user-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(user)
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Nao foi possivel criar a sessao.");
      }

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
