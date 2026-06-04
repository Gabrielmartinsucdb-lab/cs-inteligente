import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GptsClient } from "./gpts-client";

export default function GptsPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Ferramentas"
          title="GPTs"
          description="Catálogo interno com os modelos e links úteis para o trabalho do time."
        />
        <GptsClient />
      </div>
    </DashboardShell>
  );
}
