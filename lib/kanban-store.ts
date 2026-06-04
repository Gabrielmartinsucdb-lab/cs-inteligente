"use client";

import {
  KANBAN_COLUMNS,
  formatKanbanPriority,
  normalizeKanbanPriority,
  type KanbanBoardData,
  type KanbanCard,
  type KanbanColumn,
  type KanbanPriority,
  type KanbanUser
} from "@/lib/kanban";
import { listUsers, type User } from "@/lib/users-store";

export type KanbanBoardResult = {
  data: KanbanBoardData;
  source: "supabase" | "local";
};

export type KanbanCardPayload = {
  title: string;
  description: string;
  column_id: string;
  responsible_id: string;
  priority: KanbanPriority;
  start_date: string;
  due_date: string;
  labels: string[];
  attachments: { id?: string; name: string; url: string }[];
  custom_fields: Record<string, string>;
  checklist: { id?: string; text: string; completed: boolean }[];
  comments: { text: string }[];
};

export type KanbanColumnPayload = {
  name: string;
  color: string;
  order_index: number;
  is_archived: boolean;
};

const localStorageKey = "cs_kanban_board";

function isBrowser() {
  return typeof window !== "undefined";
}

function getCookieValue(name: string) {
  if (!isBrowser()) return "";

  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return "";

  return decodeURIComponent(cookie.split("=").slice(1).join("="));
}

function getCurrentActor() {
  try {
    const raw = getCookieValue("cs_user_session");
    if (!raw) return { id: null, name: "Usuário" };

    const parsed = JSON.parse(raw) as {
      name?: string;
      login?: string;
      id?: string;
    };

    return {
      id: parsed.id ?? null,
      name: parsed.name?.trim() || parsed.login?.trim() || "Usuário"
    };
  } catch {
    return { id: null, name: "Usuário" };
  }
}

function baseColumns(): KanbanColumn[] {
  return KANBAN_COLUMNS.map((column, index) => ({
    id: crypto.randomUUID(),
    name: column.name,
    color: column.color,
    order_index: index,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}

function emptyBoard(): KanbanBoardData {
  return {
    columns: baseColumns(),
    cards: [],
    users: []
  };
}

function normalizeBoard(value: unknown): KanbanBoardData {
  const board = (value ?? {}) as Partial<KanbanBoardData>;

  return {
    columns: (board.columns ?? []).map((column, index) => ({
      id: column.id ?? crypto.randomUUID(),
      name: column.name ?? "Coluna",
      color: column.color ?? null,
      order_index: Number(column.order_index ?? index),
      is_archived: Boolean(column.is_archived),
      created_at: column.created_at ?? new Date().toISOString(),
      updated_at: column.updated_at ?? new Date().toISOString()
    })).sort((a, b) => a.order_index - b.order_index),
    cards: (board.cards ?? []).map((card, index) => ({
      id: card.id ?? crypto.randomUUID(),
      title: card.title ?? "",
      description: card.description ?? "",
      column_id: card.column_id ?? "",
      order_index: Number(card.order_index ?? index),
      responsible_id: card.responsible_id ?? null,
      creator_id: card.creator_id ?? "",
      status: card.status ?? "ativo",
      priority: normalizeKanbanPriority(card.priority ?? "media"),
      start_date: card.start_date ?? null,
      due_date: card.due_date ?? null,
      completed_at: card.completed_at ?? null,
      labels: Array.isArray(card.labels) ? card.labels : [],
      attachments: Array.isArray(card.attachments) ? card.attachments : [],
      checklist: Array.isArray(card.checklist) ? card.checklist : [],
      comments: Array.isArray(card.comments) ? card.comments : [],
      custom_fields: card.custom_fields ?? {},
      history: Array.isArray(card.history) ? card.history : [],
      responsible_ids: Array.isArray(card.responsible_ids) ? card.responsible_ids : [],
      is_archived: Boolean(card.is_archived),
      created_at: card.created_at ?? new Date().toISOString(),
      updated_at: card.updated_at ?? new Date().toISOString()
    })).sort((a, b) => a.order_index - b.order_index),
    users: (board.users ?? []).map((user: KanbanUser) => ({
      id: user.id,
      name: user.name,
      is_admin: Boolean(user.is_admin),
      is_cs: Boolean(user.is_cs),
      created_at: user.created_at
    }))
  };
}

function readLocalBoard() {
  if (!isBrowser()) return emptyBoard();

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    if (!raw) return emptyBoard();
    return normalizeBoard(JSON.parse(raw));
  } catch {
    return emptyBoard();
  }
}

function writeLocalBoard(board: KanbanBoardData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(localStorageKey, JSON.stringify(board));
}

function sorted(board: KanbanBoardData): KanbanBoardData {
  return {
    ...board,
    columns: [...board.columns].sort((a, b) => a.order_index - b.order_index),
    cards: [...board.cards].sort((a, b) => a.order_index - b.order_index)
  };
}

function withHistory(text: string) {
  return {
    id: crypto.randomUUID(),
    text,
    created_at: new Date().toISOString()
  };
}

async function requestBoard(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Kanban API ${response.status}`);
  }

  return (await response.json()) as KanbanBoardResult;
}

async function readUsers(): Promise<KanbanUser[]> {
  try {
    const users = (await listUsers()) as User[];
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      is_admin: Boolean(user.is_admin),
      is_cs: Boolean(user.is_cs),
      created_at: user.created_at
    }));
  } catch {
    return [];
  }
}

export async function listKanbanBoard(): Promise<KanbanBoardResult> {
  try {
    return await requestBoard("/api/kanban");
  } catch {
    const local = sorted(readLocalBoard());
    const users = await readUsers();
    return { data: { ...local, users }, source: "local" };
  }
}

export async function saveKanbanCard(
  payload: Partial<KanbanCardPayload>,
  id?: string | null
): Promise<KanbanBoardResult> {
  try {
    return await requestBoard("/api/kanban", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kind: "card",
        id,
        payload
      })
    });
  } catch {
    const board = readLocalBoard();
    const actor = getCurrentActor();
    const now = new Date().toISOString();
    const cleanPayload = {
      title: payload.title?.trim() ?? "",
      description: payload.description?.trim() ?? "",
      column_id: payload.column_id?.trim() ?? board.columns[0]?.id ?? "",
      responsible_id: payload.responsible_id?.trim() ?? "",
      priority: normalizeKanbanPriority(payload.priority ?? "media"),
      start_date: payload.start_date?.trim() ?? "",
      due_date: payload.due_date?.trim() ?? "",
      labels: payload.labels ?? [],
      custom_fields: payload.custom_fields ?? {},
      checklist: payload.checklist ?? [],
      comments: payload.comments ?? []
    };
    const normalizedChecklist = cleanPayload.checklist.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      text: item.text,
      completed: item.completed
    }));
    const normalizedComments = cleanPayload.comments.map((item) => ({
      id: crypto.randomUUID(),
      text: item.text,
      author_id: actor.id ?? "",
      author_name: actor.name,
      created_at: now
    }));

    const nextCards = id
      ? board.cards.map((card) => {
          if (card.id !== id) return card;

          return {
            ...card,
            title: cleanPayload.title || card.title,
            description: cleanPayload.description,
            column_id: cleanPayload.column_id || card.column_id,
            responsible_id: cleanPayload.responsible_id || null,
            priority: cleanPayload.priority,
            start_date: cleanPayload.start_date || null,
            due_date: cleanPayload.due_date || null,
            labels: cleanPayload.labels,
            custom_fields: cleanPayload.custom_fields,
            checklist: normalizedChecklist,
            comments: normalizedComments,
            updated_at: now,
            history: [...card.history, withHistory(`${actor.name} atualizou o cartão.`)]
          };
        })
      : [
          {
            id: crypto.randomUUID(),
            title: cleanPayload.title,
            description: cleanPayload.description,
            column_id: cleanPayload.column_id,
            order_index:
              Math.max(
                0,
                ...board.cards
                  .filter((card) => card.column_id === cleanPayload.column_id)
                  .map((card) => card.order_index)
              ) + 1,
            responsible_id:
              cleanPayload.responsible_id || null,
            responsible_ids: [],
            creator_id: actor.id ?? "",
            status: "ativo",
            priority: cleanPayload.priority,
            start_date: cleanPayload.start_date || null,
            due_date: cleanPayload.due_date || null,
            completed_at: null,
            labels: cleanPayload.labels,
            attachments: [],
            checklist: normalizedChecklist,
            comments: normalizedComments,
            custom_fields: cleanPayload.custom_fields,
            history: [withHistory(`${actor.name} criou um cartão.`)],
            is_archived: false,
            created_at: now,
            updated_at: now
          } satisfies KanbanCard,
          ...board.cards
        ];

    const next = sorted({ ...board, cards: nextCards });
    writeLocalBoard(next);
    return { data: { ...next, users: await readUsers() }, source: "local" };
  }
}

export async function deleteKanbanCard(id: string): Promise<KanbanBoardResult> {
  try {
    return await requestBoard("/api/kanban", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ kind: "card", id })
    });
  } catch {
    const next = readLocalBoard().cards.filter((card) => card.id !== id);
    const board = { ...readLocalBoard(), cards: next };
    writeLocalBoard(board);
    return { data: { ...sorted(board), users: await readUsers() }, source: "local" };
  }
}

export async function saveKanbanColumn(
  payload: Partial<KanbanColumnPayload>,
  id?: string | null
): Promise<KanbanBoardResult> {
  try {
    return await requestBoard("/api/kanban", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kind: "column",
        id,
        payload
      })
    });
  } catch {
    const board = readLocalBoard();
    const now = new Date().toISOString();
    const cleanPayload = {
      name: payload.name?.trim() ?? "",
      color: payload.color?.trim() ?? "",
      order_index: Number(payload.order_index ?? board.columns.length),
      is_archived: Boolean(payload.is_archived)
    };

    const nextColumns = id
      ? board.columns.map((column) =>
          column.id === id
            ? {
                ...column,
                name: cleanPayload.name || column.name,
                color: cleanPayload.color,
                order_index: cleanPayload.order_index,
                is_archived: cleanPayload.is_archived,
                updated_at: now
              }
            : column
        )
      : [
          {
            id: crypto.randomUUID(),
            name: cleanPayload.name || "Nova coluna",
            color: cleanPayload.color || "#334155",
            order_index: cleanPayload.order_index,
            is_archived: cleanPayload.is_archived,
            created_at: now,
            updated_at: now
          },
          ...board.columns
        ];

    const next = sorted({ ...board, columns: nextColumns });
    writeLocalBoard(next);
    return { data: { ...next, users: await readUsers() }, source: "local" };
  }
}

export async function deleteKanbanColumn(id: string): Promise<KanbanBoardResult> {
  try {
    return await requestBoard("/api/kanban", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ kind: "column", id })
    });
  } catch {
    const board = readLocalBoard();
    const hasCards = board.cards.some((card) => card.column_id === id);
    if (hasCards) {
      return { data: { ...sorted(board), users: await readUsers() }, source: "local" };
    }

    const next = {
      ...board,
      columns: board.columns.filter((column) => column.id !== id)
    };
    writeLocalBoard(next);
    return { data: { ...sorted(next), users: await readUsers() }, source: "local" };
  }
}

export async function moveKanbanCard(
  id: string,
  columnId: string
): Promise<KanbanBoardResult> {
  return saveKanbanCard({ column_id: columnId }, id);
}

export function buildCardTitle(card: Pick<KanbanCard, "title" | "priority">) {
  return `${card.title} · ${formatKanbanPriority(card.priority)}`;
}
