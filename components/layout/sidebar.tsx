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
    <aside className="hidden w-64 border-r bg-white lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-sm font-semibold text-slate-950">CS Inteligente</p>
          <p className="text-xs text-slate-500">Operações internas</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                active && "bg-slate-950 text-white hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
