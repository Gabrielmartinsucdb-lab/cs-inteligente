import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AulasClient } from "./aulas-client";

export default function AulasPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Aulas</h1>
          <p className="text-sm text-slate-500">Base rápida de aulas para atendimento.</p>
        </div>
        <AulasClient />
      </div>
    </DashboardShell>
  );
}
