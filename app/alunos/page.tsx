import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AlunosClient } from "./alunos-client";

export default function AlunosPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Base operacional"
          title="Alunos"
          description="Cadastre, acompanhe e filtre a base com foco em mentoria, CS responsável e histórico de acompanhamento."
        />
        <AlunosClient />
      </div>
    </DashboardShell>
  );
}
