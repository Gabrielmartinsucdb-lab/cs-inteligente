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

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...baseItems.slice(0, 3), ...adminItems] : baseItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-slate-950 text-white lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-slate-400",
              active && "text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
