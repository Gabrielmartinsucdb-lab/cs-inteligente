import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase-server";

export async function DashboardShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const localUser = cookieStore.get(LOCAL_ADMIN.userCookieName)?.value === "true";
  const isSupabaseAdmin =
    user?.email === LOCAL_ADMIN.email || user?.user_metadata?.role === "admin";
  const isAdmin = localAdmin || isSupabaseAdmin;

  if (!user && !localAdmin && !localUser) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 pb-20 lg:p-8">{children}</main>
        <MobileNav isAdmin={isAdmin} />
      </div>
    </div>
  );
}
