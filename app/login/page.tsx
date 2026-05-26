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
  const router = useRouter();

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
        "BUSCANDO USER NO SUPABASE..."
      );

      const user =
        await findUser(
          login,
          password
        );

      if (user) {
        console.log(
          "USER ENCONTRADO:",
          user
        );

        const response =
          await fetch(
            "/api/auth/local-user-login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                id: user.id,
                name: user.name,
                login:
                  user.login,
                is_admin:
                  user.is_admin ??
                  false,
                can_create_templates:
                  user.can_create_templates ??
                  false
              })
            }
          );

        if (response.ok) {
          console.log(
            "LOGIN USER OK"
          );

          router.replace(
            "/dashboard"
          );

          router.refresh();

          return;
        }
      }

      console.log(
        "LOGIN INVÁLIDO"
      );

      setError(
        "Login ou senha inválidos."
      );
    } catch (error) {
      console.error(
        "ERRO GERAL LOGIN:",
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