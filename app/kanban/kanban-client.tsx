"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Copy,
  KanbanSquare,
  LayoutGrid,
  ListChecks,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Table2,
  Timer,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CUSTOM_FIELDS,
  formatKanbanPriority,
  type KanbanBoardData,
  type KanbanCard,
  type KanbanColumn,
  type KanbanPriority
} from "@/lib/kanban";
import {
  deleteKanbanCard,
  deleteKanbanColumn,
  listKanbanBoard,
  moveKanbanCard,
  saveKanbanCard,
  saveKanbanColumn
} from "@/lib/kanban-store";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "table" | "calendar" | "dashboard" | "timeline";

type ChecklistDraft = {
  id: string;
  text: string;
  completed: boolean;
};

type DraftCard = {
  title: string;
  description: string;
  column_id: string;
  responsible_id: string;
  priority: KanbanPriority;
  start_date: string;
  due_date: string;
  labelsText: string;
  attachmentsText: string;
  custom_fields: Record<string, string>;
  checklist: ChecklistDraft[];
  comments: { text: string; created_at?: string }[];
  newComment: string;
};

type DraftColumn = {
  name: string;
  color: string;
  order_index: number;
  is_archived: boolean;
};

type CurrentUser = {
  id: string | null;
  name: string;
};

const viewItems: Array<{
  value: ViewMode;
  label: string;
  icon: typeof KanbanSquare;
}> = [
  { value: "board", label: "Quadro", icon: KanbanSquare },
  { value: "table", label: "Tabela", icon: Table2 },
  { value: "calendar", label: "Calendário", icon: CalendarDays },
  { value: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { value: "timeline", label: "Timeline", icon: Timer }
];

const priorityOptions: Array<{
  value: KanbanPriority;
  label: string;
}> = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" }
];

function readSession(): CurrentUser {
  if (typeof document === "undefined") {
    return { id: null, name: "Usuário" };
  }

  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith("cs_user_session="));

  if (!cookie) {
    return { id: null, name: "Usuário" };
  }

  try {
    const raw = decodeURIComponent(cookie.split("=").slice(1).join("="));
    const parsed = JSON.parse(raw) as { id?: string; name?: string; login?: string };

    return {
      id: parsed.id ?? null,
      name: parsed.name?.trim() || parsed.login?.trim() || "Usuário"
    };
  } catch {
    return { id: null, name: "Usuário" };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseLabels(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAttachments(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, url] = line.split("|").map((part) => part.trim());
      return {
        id: `${index}-${crypto.randomUUID()}`,
        name: url ? name || `Anexo ${index + 1}` : `Anexo ${index + 1}`,
        url: url || name
      };
    });
}

function checklistProgress(card: KanbanCard) {
  const total = card.checklist.length;
  const done = card.checklist.filter((item) => item.completed).length;
  return { done, total };
}

function checklistSummary(items: Array<{ completed: boolean }>) {
  const total = items.length;
  const done = items.filter((item) => item.completed).length;
  return `${done}/${total}`;
}

function isOverdue(card: KanbanCard) {
  if (!card.due_date || card.completed_at || card.is_archived) return false;

  const now = new Date();
  const due = new Date(card.due_date);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < now;
}

function normalizeBoardUsers(board: KanbanBoardData) {
  return [...board.users].sort((a, b) => a.name.localeCompare(b.name));
}

function defaultCustomFields() {
  return DEFAULT_CUSTOM_FIELDS.reduce<Record<string, string>>((acc, field) => {
    acc[field] = "";
    return acc;
  }, {});
}

function emptyColumnDraft(orderIndex = 0): DraftColumn {
  return {
    name: "",
    color: "#334155",
    order_index: orderIndex,
    is_archived: false
  };
}

function draftFromCard(card: KanbanCard): DraftCard {
  return {
    title: card.title,
    description: card.description,
    column_id: card.column_id,
    responsible_id: card.responsible_id ?? "",
    priority: card.priority,
    start_date: toInputDate(card.start_date),
    due_date: toInputDate(card.due_date),
    labelsText: card.labels.join(", "),
    attachmentsText: card.attachments
      .map((attachment) => `${attachment.name} | ${attachment.url}`)
      .join("\n"),
    custom_fields: DEFAULT_CUSTOM_FIELDS.reduce<Record<string, string>>((acc, field) => {
      acc[field] = String(card.custom_fields?.[field] ?? "");
      return acc;
    }, {}),
    checklist: card.checklist.map((item) => ({
      id: item.id,
      text: item.text,
      completed: Boolean(item.completed)
    })),
    comments: Array.isArray(card.comments) ? card.comments : [],
    newComment: ""
  };
}

function emptyDraft(columnId: string): DraftCard {
  return {
    title: "",
    description: "",
    column_id: columnId,
    responsible_id: "",
    priority: "media",
    start_date: "",
    due_date: "",
    labelsText: "",
    attachmentsText: "",
    custom_fields: defaultCustomFields(),
    checklist: [],
    comments: [],
    newComment: ""
  };
}

function cardProgress(card: KanbanCard) {
  const { done, total } = checklistProgress(card);
  return total > 0 ? `${done}/${total}` : "0/0";
}

function columnColor(column: KanbanColumn) {
  return column.color || "#334155";
}

function statusLabel(card: KanbanCard) {
  return card.is_archived ? "Arquivado" : "Ativo";
}

export function KanbanClient() {
  const [board, setBoard] = useState<KanbanBoardData>({
    columns: [],
    cards: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"supabase" | "local">("supabase");
  const [view, setView] = useState<ViewMode>("board");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: null,
    name: "Usuário"
  });
  const [search, setSearch] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todas");
  const [labelFilter, setLabelFilter] = useState("todas");
  const [columnFilter, setColumnFilter] = useState("todas");
  const [dueFilter, setDueFilter] = useState("todas");
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [showCreatedByMe, setShowCreatedByMe] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCard>(emptyDraft(""));
  const [columnDraft, setColumnDraft] = useState<DraftColumn>(emptyColumnDraft());
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [columnMessage, setColumnMessage] = useState("");

  async function loadBoard() {
    setLoading(true);
    const result = await listKanbanBoard();
    setBoard(result.data);
    setSource(result.source);
    setLoading(false);
  }

  useEffect(() => {
    setCurrentUser(readSession());
    void loadBoard();
  }, []);

  const userMap = useMemo(() => {
    return new Map(board.users.map((user) => [user.id, user.name]));
  }, [board.users]);

  const columns = useMemo(() => {
    return [...board.columns].sort((a, b) => a.order_index - b.order_index);
  }, [board.columns]);

  const cards = useMemo(() => {
    return [...board.cards].sort((a, b) => a.order_index - b.order_index);
  }, [board.cards]);

  const labels = useMemo(() => {
    return Array.from(
      new Set(cards.flatMap((card) => card.labels).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const column = columns.find((item) => item.id === card.column_id);
      const text = `${card.title} ${card.description}`.toLowerCase();
      const searchTerm = search.trim().toLowerCase();

      if (searchTerm && !text.includes(searchTerm)) return false;
      if (responsibleFilter === "sem-responsavel" && card.responsible_id) return false;
      if (responsibleFilter !== "todos" && responsibleFilter !== "sem-responsavel") {
        if (card.responsible_id !== responsibleFilter) return false;
      }
      if (priorityFilter !== "todas" && card.priority !== priorityFilter) return false;
      if (labelFilter !== "todas" && !card.labels.includes(labelFilter)) return false;
      if (columnFilter !== "todas" && card.column_id !== columnFilter) return false;
      if (showMineOnly && card.responsible_id !== currentUser.id) return false;
      if (showCreatedByMe && card.creator_id !== currentUser.id) return false;
      if (showUnassigned && card.responsible_id) return false;
      if (showOverdueOnly && !isOverdue(card)) return false;
      if (dueFilter === "vencidas" && !isOverdue(card)) return false;
      if (dueFilter === "concluidas" && column?.name !== "Concluído") return false;
      if (dueFilter === "sem-prazo" && card.due_date) return false;
      if (dueFilter === "com-prazo" && !card.due_date) return false;
      if (dueFilter === "hoje") {
        const today = new Date().toISOString().slice(0, 10);
        if (toInputDate(card.due_date) !== today) return false;
      }

      return true;
    });
  }, [
    cards,
    columns,
    currentUser.id,
    dueFilter,
    labelFilter,
    priorityFilter,
    responsibleFilter,
    search,
    showCreatedByMe,
    showMineOnly,
    showOverdueOnly,
    showUnassigned,
    columnFilter
  ]);

  const boardCardsByColumn = useMemo(() => {
    return columns.map((column) => ({
      column,
      cards: filteredCards.filter((card) => card.column_id === column.id)
    }));
  }, [columns, filteredCards]);

  const metrics = useMemo(() => {
    const total = cards.length;
    const overdue = cards.filter(isOverdue).length;
    const urgent = cards.filter((card) => card.priority === "urgente").length;
    const done = cards.filter((card) => {
      const column = columns.find((item) => item.id === card.column_id);
      return column?.name === "Concluído";
    }).length;

    return { total, overdue, urgent, done };
  }, [cards, columns]);

  const topUsers = useMemo(() => {
    return board.users
      .map((user) => ({
        ...user,
        count: cards.filter((card) => card.responsible_id === user.id).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [board.users, cards]);

  const columnStats = useMemo(() => {
    return columns.map((column) => ({
      column,
      count: cards.filter((card) => card.column_id === column.id).length
    }));
  }, [cards, columns]);

  function openCreate(columnId?: string) {
    const nextColumn = columnId || columns[0]?.id || "";
    setEditingCardId(null);
    setDraft(emptyDraft(nextColumn));
    setModalOpen(true);
  }

  function openEdit(card: KanbanCard) {
    setEditingCardId(card.id);
    setDraft(draftFromCard(card));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCardId(null);
    setDraft(emptyDraft(columns[0]?.id || ""));
  }

  function openColumnEditor() {
    setColumnEditorOpen(true);
    setColumnMessage("");
  }

  function closeColumnEditor() {
    setColumnEditorOpen(false);
    setEditingColumnId(null);
    setColumnDraft(emptyColumnDraft(columns.length));
  }

  function editColumn(column: KanbanColumn) {
    setEditingColumnId(column.id);
    setColumnDraft({
      name: column.name,
      color: column.color || "#334155",
      order_index: column.order_index,
      is_archived: column.is_archived
    });
    setColumnMessage("");
  }

  function createColumnDraft() {
    setEditingColumnId(null);
    setColumnDraft(emptyColumnDraft(columns.length));
    setColumnMessage("");
  }

  async function persistColumn() {
    if (!columnDraft.name.trim()) {
      setColumnMessage("O nome da coluna é obrigatório.");
      return;
    }

    setSaving(true);
    const result = await saveKanbanColumn(
      {
        name: columnDraft.name.trim(),
        color: columnDraft.color.trim(),
        order_index: columnDraft.order_index,
        is_archived: columnDraft.is_archived
      },
      editingColumnId
    );

    setBoard(result.data);
    setSource(result.source);
    setColumnMessage(
      editingColumnId ? "Coluna atualizada." : "Coluna criada."
    );
    setSaving(false);
    setEditingColumnId(null);
    setColumnDraft(emptyColumnDraft(result.data.columns.length));
  }

  async function removeColumnDraft(columnId: string) {
    const confirmed = window.confirm("Excluir esta coluna? Ela precisa estar vazia.");
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteKanbanColumn(columnId);
    setBoard(result.data);
    setSource(result.source);
    setSaving(false);
    setColumnMessage(result.error || "Coluna removida.");
    if (editingColumnId === columnId) {
      setEditingColumnId(null);
      setColumnDraft(emptyColumnDraft(result.data.columns.length));
    }
  }

  async function persistCard() {
    if (!draft.title.trim()) {
      setMessage("O título da tarefa é obrigatório.");
      return;
    }

    setSaving(true);
    const result = await saveKanbanCard(
      {
        title: draft.title.trim(),
        description: draft.description.trim(),
        column_id: draft.column_id,
        responsible_id: draft.responsible_id.trim(),
        priority: draft.priority,
        start_date: draft.start_date,
        due_date: draft.due_date,
        labels: parseLabels(draft.labelsText),
        attachments: parseAttachments(draft.attachmentsText),
        custom_fields: draft.custom_fields,
        checklist: draft.checklist,
        comments: draft.comments
      },
      editingCardId
    );

    setBoard(result.data);
    setSource(result.source);
    setMessage("Tarefa salva com sucesso.");
    setSaving(false);
    closeModal();
  }

  async function removeCard(id: string) {
    const confirmed = window.confirm("Excluir esta tarefa?");
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteKanbanCard(id);
    setBoard(result.data);
    setSource(result.source);
    setSaving(false);
    setMessage("Tarefa removida.");
  }

  async function removeColumn(columnId: string) {
    const confirmed = window.confirm("Excluir esta coluna?");
    if (!confirmed) return;

    setSaving(true);
    const result = await deleteKanbanColumn(columnId);
    setBoard(result.data);
    setSource(result.source);
    setSaving(false);
    setMessage(result.error || "Coluna atualizada.");
  }

  async function moveCard(id: string, columnId: string) {
    setSaving(true);
    const result = await moveKanbanCard(id, columnId);
    setBoard(result.data);
    setSource(result.source);
    setSaving(false);
  }

  async function duplicateCard(card: KanbanCard) {
    setSaving(true);
    const result = await saveKanbanCard(
      {
        title: `${card.title} (cópia)`,
        description: card.description,
        column_id: card.column_id,
        responsible_id: card.responsible_id ?? "",
        priority: card.priority,
        start_date: toInputDate(card.start_date),
        due_date: toInputDate(card.due_date),
        labels: card.labels,
        attachments: card.attachments,
        custom_fields: Object.fromEntries(
          Object.entries(card.custom_fields ?? {}).map(([key, value]) => [
            key,
            String(value ?? "")
          ])
        ),
        checklist: card.checklist,
        comments: card.comments
      }
    );

    setBoard(result.data);
    setSource(result.source);
    setSaving(false);
    setMessage("Tarefa duplicada.");
  }

  function onDropCard(columnId: string) {
    if (!draggingCardId) return;
    void moveCard(draggingCardId, columnId);
    setDraggingCardId(null);
  }

  function addChecklistItem() {
    setDraft((current) => ({
      ...current,
      checklist: [
        ...current.checklist,
        { id: crypto.randomUUID(), text: "", completed: false }
      ]
    }));
  }

  function addComment() {
    const text = draft.newComment.trim();
    if (!text) return;
    setDraft((current) => ({
      ...current,
      comments: [...current.comments, { text, created_at: new Date().toISOString() }],
      newComment: ""
    }));
  }

  function currentMonthDays() {
    const date = new Date(calendarDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const days: Array<Date | null> = [];

    for (let i = 0; i < firstDayWeek; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  const calendarCardsByDay = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();

    cards.forEach((card) => {
      const date = toInputDate(card.due_date);
      if (!date) return;
      const list = map.get(date) || [];
      list.push(card);
      map.set(date, list);
    });

    return map;
  }, [cards]);

  const timelineCards = useMemo(() => {
    return cards.filter((card) => card.start_date && card.due_date);
  }, [cards]);

  const timelineRange = useMemo(() => {
    if (timelineCards.length === 0) return null;

    const starts = timelineCards
      .map((card) => new Date(card.start_date as string).getTime())
      .filter((value) => !Number.isNaN(value));
    const ends = timelineCards
      .map((card) => new Date(card.due_date as string).getTime())
      .filter((value) => !Number.isNaN(value));

    if (!starts.length || !ends.length) return null;

    return {
      start: Math.min(...starts),
      end: Math.max(...ends)
    };
  }, [timelineCards]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {viewItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.value;

              return (
                <Button
                  key={item.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="min-w-28"
                  onClick={() => setView(item.value)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void loadBoard()}>
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" variant="outline" onClick={openColumnEditor}>
              <Pencil className="h-4 w-4" />
              Colunas
            </Button>
            <Button type="button" onClick={() => openCreate()}>
              <CirclePlus className="h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <Label>Busca</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Procurar por título ou descrição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className="mt-2">
              <option value="todos">Todos</option>
              <option value="sem-responsavel">Sem responsável</option>
              {normalizeBoardUsers(board).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Prioridade</Label>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="mt-2">
              <option value="todas">Todas</option>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Coluna</Label>
            <Select value={columnFilter} onChange={(e) => setColumnFilter(e.target.value)} className="mt-2">
              <option value="todas">Todas</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Etiqueta</Label>
            <Select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} className="mt-2">
              <option value="todas">Todas</option>
              {labels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant={showMineOnly ? "default" : "outline"} onClick={() => setShowMineOnly((value) => !value)}>
            Minhas tarefas
          </Button>
          <Button type="button" variant={showCreatedByMe ? "default" : "outline"} onClick={() => setShowCreatedByMe((value) => !value)}>
            Criadas por mim
          </Button>
          <Button type="button" variant={showUnassigned ? "default" : "outline"} onClick={() => setShowUnassigned((value) => !value)}>
            Sem responsável
          </Button>
          <Button type="button" variant={showOverdueOnly ? "default" : "outline"} onClick={() => setShowOverdueOnly((value) => !value)}>
            Vencidas
          </Button>
          <Select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className="w-44">
            <option value="todas">Todas as datas</option>
            <option value="vencidas">Vencidas</option>
            <option value="hoje">Vence hoje</option>
            <option value="sem-prazo">Sem prazo</option>
            <option value="com-prazo">Com prazo</option>
            <option value="concluidas">Concluídas</option>
          </Select>
        </div>

        {message ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="mt-4 text-xs text-slate-500">
          Fonte de dados: {source === "supabase" ? "Supabase" : "local"}.
          {loading ? " Carregando..." : ""}
        </div>
      </section>

      {view === "board" ? (
        <section className="space-y-4">
          <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-[repeat(7,minmax(280px,1fr))]">
            {boardCardsByColumn.map(({ column, cards: columnCards }) => (
              <div
                key={column.id}
                className={cn(
                  "flex min-h-[520px] flex-col rounded-2xl border p-3",
                  column.is_archived
                    ? "border-slate-300 bg-slate-100/80 opacity-85"
                    : "border-slate-200 bg-slate-50/80"
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropCard(column.id)}
              >
                <div
                  className="mb-3 flex items-center justify-between rounded-xl px-3 py-3 text-white"
                  style={{ backgroundColor: columnColor(column) }}
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>{column.name}</span>
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                        {columnCards.length}
                      </span>
                      {column.is_archived ? (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                          Arquivada
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-white/75">Arraste tarefas para mover entre etapas.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => openCreate(column.id)} aria-label="Nova tarefa">
                      <Plus className="h-4 w-4" />
                    </Button>
                    {columnCards.length === 0 ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => void removeColumn(column.id)} aria-label="Excluir coluna">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  {columnCards.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                      Sem cartões nesta etapa.
                    </div>
                  ) : null}

                  {columnCards.map((card) => {
                    const responsible = card.responsible_id ? userMap.get(card.responsible_id) : null;
                    const { done, total } = checklistProgress(card);

                    return (
                      <article
                        key={card.id}
                        draggable
                        onDragStart={() => setDraggingCardId(card.id)}
                        onDragEnd={() => setDraggingCardId(null)}
                        className={cn(
                          "cursor-move rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5",
                          draggingCardId === card.id && "opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{card.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{card.description || "Sem descrição."}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(card)} aria-label="Editar tarefa">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold text-white", card.priority === "urgente" ? "bg-red-600" : card.priority === "alta" ? "bg-amber-600" : card.priority === "media" ? "bg-slate-700" : "bg-emerald-600")}>
                            {formatKanbanPriority(card.priority)}
                          </span>
                          {card.labels.slice(0, 2).map((label) => (
                            <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                              {label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5" />
                            <span>{responsible || "Sem responsável"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>{card.due_date ? formatDate(card.due_date) : "Sem prazo"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ListChecks className="h-3.5 w-3.5" />
                            <span>{cardProgress(card)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{statusLabel(card)}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => duplicateCard(card)}>
                            <Copy className="h-4 w-4" />
                            Duplicar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => removeCard(card.id)}>
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {view === "table" ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Coluna</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Etiquetas</th>
                  <th className="px-4 py-3">Última atualização</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const responsible = card.responsible_id ? userMap.get(card.responsible_id) : "Sem responsável";
                  const column = columns.find((item) => item.id === card.column_id);

                  return (
                    <tr key={card.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-950">{card.title}</td>
                      <td className="px-4 py-3 text-slate-600">{responsible}</td>
                      <td className="px-4 py-3 text-slate-600">{column?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatKanbanPriority(card.priority)}</td>
                      <td className="px-4 py-3 text-slate-600">{card.due_date ? formatDate(card.due_date) : "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{card.labels.join(", ") || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(card.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={() => openEdit(card)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => removeCard(card.id)} aria-label="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "calendar" ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Calendário</h2>
              <p className="text-sm text-slate-500">Tarefas com data de entrega aparecem no mês selecionado.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCalendarDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-56 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-950">
                {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calendarDate)}
              </div>
              <Button variant="outline" size="icon" onClick={() => setCalendarDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {currentMonthDays().map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50/70" />;
              }

              const key = day.toISOString().slice(0, 10);
              const dayCards = calendarCardsByDay.get(key) || [];
              const today = new Date().toISOString().slice(0, 10) === key;

              return (
                <div key={key} className={cn("min-h-32 rounded-xl border p-3", today ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white")}>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-950">
                    <span>{day.getDate()}</span>
                    <span className="text-xs text-slate-500">{dayCards.length} tarefas</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {dayCards.slice(0, 4).map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => openEdit(card)}
                        className={cn(
                          "block w-full rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition",
                          isOverdue(card) ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                      >
                        {card.title}
                      </button>
                    ))}
                    {dayCards.length > 4 ? (
                      <div className="text-xs text-slate-500">+ {dayCards.length - 4} tarefas</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Sem data de entrega</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {cards.filter((card) => !card.due_date).map((card) => (
                <button key={card.id} type="button" onClick={() => openEdit(card)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                  {card.title}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {columnEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/60 p-4">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Editor de colunas</h2>
                <p className="text-sm text-slate-500">Crie, renomeie e arquive colunas sem mexer nas tarefas.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeColumnEditor}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid flex-1 gap-0 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Colunas existentes</h3>
                    <p className="text-xs text-slate-500">Clique em editar para ajustar nome, cor e status.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={createColumnDraft}>
                    <Plus className="h-4 w-4" />
                    Nova
                  </Button>
                </div>

                {columnMessage ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {columnMessage}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className={cn(
                        "rounded-xl border p-4",
                        editingColumnId === column.id
                          ? "border-slate-950 bg-slate-50"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-slate-200"
                              style={{ backgroundColor: column.color || "#334155" }}
                            />
                            <h4 className="truncate text-sm font-semibold text-slate-950">
                              {column.name}
                            </h4>
                            {column.is_archived ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                Arquivada
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {board.cards.filter((card) => card.column_id === column.id).length} tarefa(s)
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button type="button" size="icon" variant="outline" onClick={() => editColumn(column)} aria-label="Editar coluna">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void removeColumnDraft(column.id)}
                            aria-label="Excluir coluna"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-950">
                  {editingColumnId ? "Editar coluna" : "Nova coluna"}
                </h3>
                <p className="text-xs text-slate-500">
                  Alterações são salvas no banco e aparecem para toda a equipe.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={columnDraft.name}
                      onChange={(e) =>
                        setColumnDraft((current) => ({
                          ...current,
                          name: e.target.value
                        }))
                      }
                      placeholder="Ex: Em análise"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="h-11 w-16 p-1"
                        value={columnDraft.color}
                        onChange={(e) =>
                          setColumnDraft((current) => ({
                            ...current,
                            color: e.target.value
                          }))
                        }
                      />
                      <Input
                        value={columnDraft.color}
                        onChange={(e) =>
                          setColumnDraft((current) => ({
                            ...current,
                            color: e.target.value
                          }))
                        }
                        placeholder="#334155"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Ordem</Label>
                    <Input
                      type="number"
                      min={0}
                      value={columnDraft.order_index}
                      onChange={(e) =>
                        setColumnDraft((current) => ({
                          ...current,
                          order_index: Number(e.target.value)
                        }))
                      }
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={columnDraft.is_archived}
                      onChange={(e) =>
                        setColumnDraft((current) => ({
                          ...current,
                          is_archived: e.target.checked
                        }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-950">Arquivar coluna</span>
                      <span className="block text-xs text-slate-500">
                        Mantém a coluna no sistema, mas sinalizada como arquivada.
                      </span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2 pt-2">
                    <Button type="button" onClick={() => void persistColumn()} disabled={saving}>
                      {saving ? "Salvando..." : editingColumnId ? "Salvar alterações" : "Criar coluna"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeColumnEditor}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {view === "dashboard" ? (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent>
                <p className="text-sm text-slate-500">Total de tarefas</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-slate-500">Tarefas concluídas</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.done}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-slate-500">Vencidas</p>
                <p className="mt-2 text-3xl font-semibold text-red-600">{metrics.overdue}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-slate-500">Urgentes</p>
                <p className="mt-2 text-3xl font-semibold text-amber-600">{metrics.urgent}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tarefas por coluna</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnStats.map(({ column, count }) => (
                  <div key={column.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{column.name}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full" style={{ width: `${metrics.total ? (count / metrics.total) * 100 : 0}%`, backgroundColor: columnColor(column) }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tarefas por responsável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topUsers.map((user) => (
                  <div key={user.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{user.name}</span>
                      <span className="text-slate-500">{user.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-950" style={{ width: `${metrics.total ? (user.count / metrics.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {view === "timeline" ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Timeline</h2>
            <p className="text-sm text-slate-500">Tarefas com início e entrega aparecem posicionadas no período.</p>
          </div>

          <div className="space-y-3">
            {timelineCards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Nenhuma tarefa com período definido.
              </div>
            ) : null}

            {timelineCards.map((card) => {
              if (!timelineRange) return null;
              const start = new Date(card.start_date as string).getTime();
              const end = new Date(card.due_date as string).getTime();
              const span = Math.max(1, timelineRange.end - timelineRange.start);
              const left = ((start - timelineRange.start) / span) * 100;
              const width = Math.max(8, ((end - start) / span) * 100);

              return (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => openEdit(card)} className="text-left">
                      <p className="font-semibold text-slate-950">{card.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(card.start_date)} - {formatDate(card.due_date)}</p>
                    </button>
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {formatKanbanPriority(card.priority)}
                    </span>
                  </div>

                  <div className="mt-3 h-3 rounded-full bg-white">
                    <div className="relative h-3 rounded-full bg-slate-100">
                      <div
                        className="absolute top-0 h-3 rounded-full bg-slate-950"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/60 p-4">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {editingCardId ? "Editar tarefa" : "Nova tarefa"}
                </h2>
                <p className="text-sm text-slate-500">Preencha os campos principais e salve para manter tudo persistido.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Título</Label>
                  <Input value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} placeholder="Digite o nome da tarefa" />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} placeholder="Descreva o contexto da tarefa" />
                </div>

                <div className="space-y-2">
                  <Label>Coluna</Label>
                  <Select value={draft.column_id} onChange={(e) => setDraft((current) => ({ ...current, column_id: e.target.value }))}>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={draft.responsible_id} onChange={(e) => setDraft((current) => ({ ...current, responsible_id: e.target.value }))}>
                    <option value="">Sem responsável</option>
                    {normalizeBoardUsers(board).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={draft.priority} onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value as KanbanPriority }))}>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input type="date" value={draft.due_date} onChange={(e) => setDraft((current) => ({ ...current, due_date: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="date" value={draft.start_date} onChange={(e) => setDraft((current) => ({ ...current, start_date: e.target.value }))} />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Etiquetas</Label>
                  <Input value={draft.labelsText} onChange={(e) => setDraft((current) => ({ ...current, labelsText: e.target.value }))} placeholder="Cliente, prioridade, demanda" />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label>Anexos</Label>
                  <Textarea
                    value={draft.attachmentsText}
                    onChange={(e) => setDraft((current) => ({ ...current, attachmentsText: e.target.value }))}
                    placeholder="Uma linha por anexo. Exemplo: Briefing | https://..."
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-950">Campos personalizados</h3>
                      <p className="text-xs text-slate-500">Base para Cliente, Processo, Área e similares.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {DEFAULT_CUSTOM_FIELDS.map((field) => (
                      <div key={field} className="space-y-2">
                        <Label>{field}</Label>
                        <Input
                          value={draft.custom_fields[field] ?? ""}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              custom_fields: {
                                ...current.custom_fields,
                                [field]: e.target.value
                              }
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">Checklist</h3>
                        <p className="text-xs text-slate-500">{checklistSummary(draft.checklist)} concluídos</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                        <Plus className="h-4 w-4" />
                        Item
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {draft.checklist.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                checklist: current.checklist.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, completed: event.target.checked } : entry
                                )
                              }))
                            }
                          />
                          <Input
                            value={item.text}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                checklist: current.checklist.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, text: event.target.value } : entry
                                )
                              }))
                            }
                            placeholder="Item do checklist"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                checklist: current.checklist.filter((_, entryIndex) => entryIndex !== index)
                              }))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">Comentários</h3>
                        <p className="text-xs text-slate-500">Registros internos da tarefa.</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {draft.comments.map((comment, index) => (
                        <div key={`${comment.created_at ?? index}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <p>{comment.text}</p>
                          {comment.created_at ? <p className="mt-1 text-xs text-slate-500">{formatDateTime(comment.created_at)}</p> : null}
                        </div>
                      ))}

                      <Textarea
                        value={draft.newComment}
                        onChange={(e) => setDraft((current) => ({ ...current, newComment: e.target.value }))}
                        placeholder="Adicionar comentário"
                      />
                      <Button type="button" variant="outline" onClick={addComment}>
                        Adicionar comentário
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <div className="text-xs text-slate-500">
                {editingCardId ? "Alterações vão atualizar a tarefa existente." : "A tarefa nova será salva na coluna selecionada."}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void persistCard()} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
