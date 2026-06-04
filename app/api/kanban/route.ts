import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LOCAL_ADMIN } from "@/lib/admin-auth";
import {
  KANBAN_COLUMNS,
  normalizeKanbanPriority,
  type KanbanBoardData,
  type KanbanCard,
  type KanbanColumn
} from "@/lib/kanban";
import { parseLocalSession } from "@/lib/local-session";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function getActor() {
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const session = parseLocalSession(cookieStore.get("cs_user_session")?.value);

  return {
    allowed: localAdmin || Boolean(session),
    id: session?.id ?? null,
    name:
      (localAdmin ? "Gabriel Martins" : session?.name?.trim() || session?.login?.trim()) ||
      "Usuário"
  };
}

function toColumn(column: any, index: number): KanbanColumn {
  return {
    id: column.id,
    name: column.name,
    color: column.color ?? null,
    order_index: Number(column.order_index ?? index),
    is_archived: Boolean(column.is_archived),
    created_at: column.created_at,
    updated_at: column.updated_at
  };
}

function toCard(card: any): KanbanCard {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? "",
    column_id: card.column_id ?? "",
    order_index: Number(card.order_index ?? 0),
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
    created_at: card.created_at,
    updated_at: card.updated_at
  };
}

async function seedColumnsIfNeeded(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("kanban_columns")
    .select("id")
    .limit(1);

  if (error || (data ?? []).length > 0) return;

  await supabase.from("kanban_columns").insert(
    KANBAN_COLUMNS.map((column, index) => ({
      name: column.name,
      color: column.color,
      order_index: index,
      is_archived: false
    }))
  );
}

async function loadBoard(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<KanbanBoardData> {
  if (!supabase) {
    return { columns: [], cards: [], users: [] };
  }

  await seedColumnsIfNeeded(supabase);

  const [columnsResult, cardsResult, usersResult] = await Promise.all([
    supabase
      .from("kanban_columns")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("kanban_cards")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select("id,name,is_admin,is_cs,created_at")
      .order("created_at", { ascending: false })
  ]);

  if (columnsResult.error) throw new Error(columnsResult.error.message);
  if (cardsResult.error) throw new Error(cardsResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  return {
    columns: (columnsResult.data ?? []).map(toColumn),
    cards: (cardsResult.data ?? []).map(toCard),
    users: usersResult.data ?? []
  };
}

function parseDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildHistory(action: string, actor: string) {
  return [
    {
      id: crypto.randomUUID(),
      text: `${actor} ${action}`,
      created_at: new Date().toISOString()
    }
  ];
}

export async function GET() {
  const actor = await getActor();

  if (!actor.allowed) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  try {
    const data = await loadBoard(supabase);
    return NextResponse.json({ data, source: "supabase" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel carregar o Kanban"
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const actor = await getActor();

  if (!actor.allowed) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    kind?: "card" | "column";
    id?: string;
    payload?: Record<string, unknown>;
  };

  if (!body.kind) {
    return NextResponse.json(
      { error: "Tipo de item obrigatorio" },
      { status: 400 }
    );
  }

  if (body.kind === "column") {
    const payload = body.payload ?? {};
    const name = String(payload.name ?? "").trim();
    const color = String(payload.color ?? "#334155").trim();
    const orderIndex = Number(payload.order_index ?? 0);
    const isArchived = Boolean(payload.is_archived ?? false);

    if (!name) {
      return NextResponse.json(
        { error: "Nome da coluna e obrigatorio" },
        { status: 400 }
      );
    }

    if (body.id) {
      const { error } = await supabase
        .from("kanban_columns")
        .update({
          name,
          color,
          order_index: orderIndex,
          is_archived: isArchived,
          updated_at: new Date().toISOString()
        })
        .eq("id", body.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { data: existingColumns } = await supabase
        .from("kanban_columns")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = existingColumns?.[0]?.order_index ?? 0;
      const { error } = await supabase.from("kanban_columns").insert({
        name,
        color,
        order_index: nextOrder + 1,
        is_archived: isArchived
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const data = await loadBoard(supabase);
    return NextResponse.json({ data, source: "supabase" });
  }

  const payload = body.payload ?? {};
  const title = String(payload.title ?? "").trim();

  if (body.kind === "card" && !title && !body.id) {
    return NextResponse.json(
      { error: "Titulo da tarefa e obrigatorio" },
      { status: 400 }
    );
  }

  if (body.kind === "card") {
    const currentCard = body.id
      ? await supabase
          .from("kanban_cards")
          .select("*")
          .eq("id", body.id)
          .maybeSingle()
      : { data: null, error: null };

    if (currentCard.error) {
      return NextResponse.json(
        { error: currentCard.error.message },
        { status: 400 }
      );
    }

    const existing = currentCard.data ? toCard(currentCard.data) : null;
    if (body.id && !existing) {
      return NextResponse.json(
        { error: "Tarefa nao encontrada" },
        { status: 404 }
      );
    }
    const targetColumnId = String(payload.column_id ?? existing?.column_id ?? "").trim();
    const isUpdate = Boolean(existing);

    if (!targetColumnId) {
      return NextResponse.json(
        { error: "Coluna e obrigatoria" },
        { status: 400 }
      );
    }

    const nextPriority = normalizeKanbanPriority(
      String(payload.priority ?? existing?.priority ?? "media")
    );
    const labels = Array.isArray(payload.labels) ? payload.labels : existing?.labels ?? [];
    const checklist = Array.isArray(payload.checklist)
      ? payload.checklist
      : existing?.checklist ?? [];
    const comments = Array.isArray(payload.comments)
      ? payload.comments
      : existing?.comments ?? [];
    const customFields =
      payload.custom_fields && typeof payload.custom_fields === "object"
        ? payload.custom_fields
        : existing?.custom_fields ?? {};

    const updatePayload = {
      title: title || existing?.title || "Nova tarefa",
      description: String(payload.description ?? existing?.description ?? ""),
      column_id: targetColumnId,
      responsible_id: String(payload.responsible_id ?? existing?.responsible_id ?? "").trim() || null,
      responsible_ids: Array.isArray(payload.responsible_ids)
        ? payload.responsible_ids
        : existing?.responsible_ids ?? [],
      creator_id: existing?.creator_id ?? actor.id ?? null,
      status: String(payload.status ?? existing?.status ?? "ativo"),
      priority: nextPriority,
      start_date: parseDateOrNull(payload.start_date ?? existing?.start_date),
      due_date: parseDateOrNull(payload.due_date ?? existing?.due_date),
      completed_at:
        payload.completed_at === undefined
          ? existing?.completed_at ?? null
          : parseDateOrNull(payload.completed_at),
      labels,
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments
        : existing?.attachments ?? [],
      checklist,
      comments,
      custom_fields: customFields,
      history: [
        ...(existing?.history ?? []),
        ...buildHistory(isUpdate ? "atualizou uma tarefa." : "criou uma tarefa.", actor.name)
      ],
      is_archived: Boolean(payload.is_archived ?? existing?.is_archived ?? false),
      updated_at: new Date().toISOString()
    };

    if (isUpdate) {
      const { error } = await supabase
        .from("kanban_cards")
        .update(updatePayload)
        .eq("id", body.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { data: existingCards } = await supabase
        .from("kanban_cards")
        .select("order_index")
        .eq("column_id", targetColumnId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = existingCards?.[0]?.order_index ?? 0;
      const { error } = await supabase.from("kanban_cards").insert({
        ...updatePayload,
        creator_id: actor.id ?? updatePayload.creator_id,
        order_index: nextOrder + 1,
        history: buildHistory("criou uma tarefa.", actor.name)
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const data = await loadBoard(supabase);
    return NextResponse.json({ data, source: "supabase" });
  }

  return NextResponse.json({ error: "Operacao invalida" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const actor = await getActor();

  if (!actor.allowed) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    kind?: "card" | "column";
    id?: string;
  };

  if (!body.kind || !body.id) {
    return NextResponse.json(
      { error: "Item e obrigatorio" },
      { status: 400 }
    );
  }

  if (body.kind === "column") {
    const { count, error: countError } = await supabase
      .from("kanban_cards")
      .select("id", { count: "exact", head: true })
      .eq("column_id", body.id);

    if (countError) {
      return NextResponse.json(
        { error: countError.message },
        { status: 400 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Mova ou remova as tarefas antes de excluir a coluna" },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("kanban_columns").delete().eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (body.kind === "card") {
    const { error } = await supabase.from("kanban_cards").delete().eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const data = await loadBoard(supabase);
  return NextResponse.json({ data, source: "supabase" });
}
