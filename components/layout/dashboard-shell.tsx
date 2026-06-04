import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { MobileNav } from "@/components/layout/mobile-nav";

import { Sidebar } from "@/components/layout/sidebar";

import { Topbar } from "@/components/layout/topbar";

export async function DashboardShell({
  children,
  contentClassName,
  mainClassName
}: {
  children: ReactNode;
  contentClassName?: string;
  mainClassName?: string;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <Sidebar isAdmin />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <main className={cn("flex-1 p-4 pb-24 lg:p-8", mainClassName)}>
          <div className={cn("mx-auto flex w-full max-w-[1600px] flex-col gap-6", contentClassName)}>
            {children}
          </div>
        </main>

        <MobileNav isAdmin />
      </div>
    </div>
  );
}
