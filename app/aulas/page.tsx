import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AulasClient } from "./aulas-client";

export default function AulasPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Biblioteca de apoio"
          title="Aulas"
          description="Cadastre, encontre e compartilhe aulas por mentoria com uma visualização mais organizada para o time."
        />
        <AulasClient />
      </div>
    </DashboardShell>
  );
}
