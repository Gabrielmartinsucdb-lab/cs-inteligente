"use client";

import { LogOut } from "lucide-react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function Topbar() {
  const router =
    useRouter();

  async function logout() {
    localStorage.removeItem(
      "cs_session_user"
    );

    await fetch("/api/auth/local-logout", {
      method: "POST"
    });

    window.location.href =
      "/login";
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-8">
      <div>
        <p className="text-sm font-semibold text-slate-950">
          Painel operacional
        </p>

        <p className="text-xs text-slate-500">
          Atendimento,
          aulas,
          GPTs e alunos
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />

        Sair
      </Button>
    </header>
  );
}
