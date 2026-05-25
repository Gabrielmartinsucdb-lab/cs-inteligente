import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase-server";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const isSupabaseAdmin =
    user?.email === LOCAL_ADMIN.email || user?.user_metadata?.role === "admin";

  if (!localAdmin && !isSupabaseAdmin) redirect("/dashboard");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-slate-500">Mensagens com variáveis para o formatador.</p>
        </div>
        <TemplatesClient />
      </div>
    </DashboardShell>
  );
}
