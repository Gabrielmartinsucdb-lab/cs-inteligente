import { DashboardShell } from "@/components/layout/dashboard-shell";
import { GptsClient } from "./gpts-client";

export default function GptsPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">GPTs</h1>
          <p className="text-sm text-slate-500">Catálogo interno de GPTs úteis.</p>
        </div>
        <GptsClient />
      </div>
    </DashboardShell>
  );
}
