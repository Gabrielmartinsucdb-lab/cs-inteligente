import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";

import { KanbanClient } from "./kanban-client";

export default function KanbanPage() {
  return (
    <DashboardShell contentClassName="max-w-none" mainClassName="p-3 pb-24 lg:p-4">
      <PageHeader
        eyebrow="Kanban da equipe"
        title="Kanban da Equipe"
        description="Quadro único para toda a organização, com visão em colunas, tabela, calendário, dashboard e linha do tempo."
        className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_24%),linear-gradient(180deg,#0a1020_0%,#05070b_100%)] shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
      />

      <KanbanClient />
    </DashboardShell>
  );
}
