"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, GraduationCap, KanbanSquare, LayoutDashboard, MessageSquareText, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/formatador", label: "Formatador", icon: MessageSquareText },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/gpts", label: "GPTs", icon: Bot },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/alunos", label: "Alunos", icon: Users }
];

const adminItems = [
  { href: "/templates", label: "Templates", icon: GraduationCap },
  { href: "/usuarios", label: "Usuários", icon: UserPlus }
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems;

  return (
    <aside className="group/sidebar fixed left-0 top-0 z-40 hidden h-screen w-20 overflow-visible border-r border-slate-900 bg-slate-950 text-white lg:block">
      <div className="relative h-full">
        <div className="relative z-20 flex h-full w-20 flex-col border-r border-slate-900 bg-slate-950">
          <div className="flex h-24 items-center justify-center border-b border-white/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10">
              CS
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 p-3">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-xl text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
                    active && "bg-white text-slate-950 shadow-[0_14px_28px_rgba(0,0,0,0.22)] hover:bg-white hover:text-slate-950"
                  )}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-72 overflow-hidden rounded-r-3xl border-r border-white/10 bg-slate-950/98 text-white opacity-0 shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 ease-out group-hover/sidebar:pointer-events-auto group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 translate-x-[-12px]">
          <div className="flex h-24 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10">
                CS
              </div>
              <div>
                <p className="text-base font-semibold tracking-wide text-white">CS Inteligente</p>
                <p className="text-xs text-slate-400">Operações internas</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 p-4">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
                    active && "bg-white text-slate-950 shadow-[0_14px_28px_rgba(0,0,0,0.22)] hover:bg-white hover:text-slate-950"
                  )}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-slate-200 transition group-hover:bg-white/15 group-hover:text-white",
                    active && "bg-slate-950 text-white group-hover:bg-slate-950"
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
