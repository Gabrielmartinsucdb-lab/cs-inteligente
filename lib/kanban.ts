export const KANBAN_COLUMNS = [
  { name: "Caixa de entrada", color: "#334155" },
  { name: "A fazer", color: "#1d4ed8" },
  { name: "Em andamento", color: "#0f766e" },
  { name: "Em revisão", color: "#7c3aed" },
  { name: "Aguardando terceiro", color: "#b45309" },
  { name: "Concluído", color: "#15803d" },
  { name: "Arquivado", color: "#475569" }
] as const;

export const KANBAN_PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" }
] as const;

export type KanbanPriority =
  (typeof KANBAN_PRIORITIES)[number]["value"];

export type KanbanColumn = {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type KanbanChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  responsible_id?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

export type KanbanComment = {
  id: string;
  text: string;
  author_id?: string;
  author_name?: string;
  created_at?: string;
};

export type KanbanCard = {
  id: string;
  title: string;
  description: string;
  column_id: string;
  order_index: number;
  responsible_id: string | null;
  creator_id: string;
  status: string;
  priority: KanbanPriority;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  labels: string[];
  attachments: { id: string; name: string; url: string }[];
  checklist: KanbanChecklistItem[];
  comments: KanbanComment[];
  custom_fields: Record<string, unknown>;
  history: {
    id: string;
    text: string;
    created_at: string;
  }[];
  responsible_ids?: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type KanbanUser = {
  id: string;
  name: string;
  is_admin: boolean;
  is_cs: boolean;
  created_at: string;
};

export type KanbanBoardData = {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  users: KanbanUser[];
};

export const DEFAULT_CUSTOM_FIELDS = [
  "Cliente",
  "Processo",
  "Area",
  "Valor",
  "Canal de origem",
  "Tipo de demanda"
];

export function normalizeKanbanPriority(
  value: string
): KanbanPriority {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "urgente" ||
    normalized === "alta" ||
    normalized === "media" ||
    normalized === "média" ||
    normalized === "baixa"
  ) {
    return (normalized === "média"
      ? "media"
      : normalized) as KanbanPriority;
  }

  return "media";
}

export function formatKanbanPriority(
  value: KanbanPriority
) {
  return (
    KANBAN_PRIORITIES.find(
      (item) => item.value === value
    )?.label ?? "Média"
  );
}
