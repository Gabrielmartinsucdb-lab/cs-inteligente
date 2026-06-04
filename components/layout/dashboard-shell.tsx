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
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <Sidebar isAdmin />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-4 pb-24 lg:p-8">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
            {children}
          </div>
        </main>

        <MobileNav isAdmin />
      </div>
    </div>
  );
}
