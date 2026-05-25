import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AlunosClient } from "./alunos-client";

export default function AlunosPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Alunos</h1>
          <p className="text-sm text-slate-500">Cadastro e planilhas da base operacional.</p>
        </div>
        <AlunosClient />
      </div>
    </DashboardShell>
  );
}
