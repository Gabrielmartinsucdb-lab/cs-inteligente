import { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";

import { Sidebar } from "@/components/layout/sidebar";

import { Topbar } from "@/components/layout/topbar";

export async function DashboardShell({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isAdmin />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-4 pb-20 lg:p-8">
          {children}
        </main>

        <MobileNav isAdmin />
      </div>
    </div>
  );
}