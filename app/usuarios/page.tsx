import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { canAccessUsers, parseLocalSession } from "@/lib/local-session";
import { createClient } from "@/lib/supabase-server";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const session = parseLocalSession(cookieStore.get("cs_user_session")?.value);
  const isSupabaseAdmin =
    user?.email === LOCAL_ADMIN.email || user?.user_metadata?.role === "admin";

  if (!localAdmin && !isSupabaseAdmin && !canAccessUsers(session)) redirect("/dashboard");

  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Acessos"
          title="Usuários"
          description="Criação e controle dos acessos operacionais, com permissões para CS, templates e administração."
        />
        <UsuariosClient />
      </div>
    </DashboardShell>
  );
}
