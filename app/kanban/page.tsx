import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";

import { KanbanClient } from "./kanban-client";

export default function KanbanPage() {
  return (
    <DashboardShell>
      <PageHeader
        eyebrow="Kanban da equipe"
        title="Kanban da Equipe"
        description="Quadro único para toda a organização, com visão em colunas, tabela, calendário, dashboard e linha do tempo."
      />

      <KanbanClient />
    </DashboardShell>
  );
}
