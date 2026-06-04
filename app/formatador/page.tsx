import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FormatadorClient } from "./formatador-client";

export default function FormatadorPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Comunicação"
          title="Formatador"
          description="Converta dados recebidos em mensagens prontas com leitura mais limpa e foco no conteúdo."
        />
        <FormatadorClient />
      </div>
    </DashboardShell>
  );
}
