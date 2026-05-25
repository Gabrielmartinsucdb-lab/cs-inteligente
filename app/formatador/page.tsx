import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FormatadorClient } from "./formatador-client";

export default function FormatadorPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Formatador</h1>
          <p className="text-sm text-slate-500">Transforme eventos do Google Calendar em mensagens prontas.</p>
        </div>
        <FormatadorClient />
      </div>
    </DashboardShell>
  );
}
