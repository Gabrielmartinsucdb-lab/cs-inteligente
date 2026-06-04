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
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
      <div>
        <p className="text-lg font-semibold text-slate-950">
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
        className="min-w-20"
      >
        <LogOut className="h-4 w-4" />

        Sair
      </Button>
    </header>
  );
}
