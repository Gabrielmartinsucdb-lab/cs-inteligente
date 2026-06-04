import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Visão geral"
          title="Dashboard"
          description="Uma leitura rápida da operação, com métricas principais, distribuição por mentoria e movimento da equipe em um único lugar."
        />
        <DashboardClient />
      </div>
    </DashboardShell>
  );
}
