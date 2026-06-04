"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, GraduationCap, LayoutDashboard, MessageSquareText, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/formatador", label: "Formatador", icon: MessageSquareText },
  { href: "/aulas", label: "Aulas", icon: BookOpen },
  { href: "/gpts", label: "GPTs", icon: Bot },
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
    <aside className="hidden w-72 border-r border-slate-900 bg-slate-950 text-white lg:block">
      <div className="flex h-24 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950 shadow-lg">
            CS
          </div>
          <div>
            <p className="text-base font-semibold tracking-wide">CS Inteligente</p>
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
                "group flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
                active && "bg-white text-slate-950 shadow-[0_14px_28px_rgba(0,0,0,0.22)] hover:bg-white hover:text-slate-950"
              )}
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
    </aside>
  );
}
