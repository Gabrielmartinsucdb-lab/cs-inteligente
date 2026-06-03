import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Acesso rápido às rotinas do CS.</p>
        </div>
        <DashboardClient />
      </div>
    </DashboardShell>
  );
}
