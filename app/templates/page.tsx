import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { canAccessTemplates, parseLocalSession } from "@/lib/local-session";
import { createClient } from "@/lib/supabase-server";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const session = parseLocalSession(cookieStore.get("cs_user_session")?.value);
  const isSupabaseAdmin =
    user?.email === LOCAL_ADMIN.email || user?.user_metadata?.role === "admin";
  const canManageTemplates =
    localAdmin ||
    isSupabaseAdmin ||
    canAccessTemplates(session);

  if (!canManageTemplates) redirect("/dashboard");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Biblioteca interna"
          title="Templates"
          description="Mensagens com variáveis para o formatador, mantidas em uma visão mais limpa e centralizada."
        />
        <TemplatesClient
          canManageTemplates={canManageTemplates}
          canDeleteTemplates={
            localAdmin ||
            isSupabaseAdmin ||
            Boolean(session?.is_admin)
          }
        />
      </div>
    </DashboardShell>
  );
}
