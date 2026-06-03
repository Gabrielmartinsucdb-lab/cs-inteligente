import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { parseLocalSession } from "@/lib/local-session";

type StudentPayload = {
  mentorship?: string;
  name?: string;
  phone?: string;
  email?: string;
  cs_responsible?: string;
  is_active?: boolean;
};

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey)
    return null;

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function hasAccess() {
  const cookieStore = await cookies();
  const localAdmin =
    cookieStore.get(LOCAL_ADMIN.cookieName)
      ?.value === "true";
  const session = parseLocalSession(
    cookieStore.get("cs_user_session")?.value
  );

  return localAdmin || Boolean(session);
}

function normalizePayload(payload: StudentPayload) {
  const next: StudentPayload = {};

  if (payload.mentorship !== undefined)
    next.mentorship = payload.mentorship.trim();
  if (payload.name !== undefined)
    next.name = payload.name.trim();
  if (payload.phone !== undefined)
    next.phone = payload.phone.trim();
  if (payload.email !== undefined)
    next.email = payload.email.trim();
  if (payload.cs_responsible !== undefined)
    next.cs_responsible =
      payload.cs_responsible.trim();
  if (payload.is_active !== undefined)
    next.is_active = payload.is_active;

  return next;
}

async function listStudents(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    source: "supabase"
  });
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { id } = await context.params;
  const payload = normalizePayload(
    (await request.json()) as StudentPayload
  );

  if (!payload.name) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return listStudents(supabase);
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: string;
    is_active?: boolean;
  };

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  if (body.action === "register_meeting") {
    const { data: current, error: readError } =
      await supabase
        .from("students")
        .select("meetings_count")
        .eq("id", id)
        .single();

    if (readError) {
      return NextResponse.json(
        { error: readError.message },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("students")
      .update({
        last_meeting_at:
          new Date().toISOString(),
        meetings_count:
          Number(current?.meetings_count ?? 0) +
          1
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return listStudents(supabase);
  }

  if (body.is_active !== undefined) {
    const { error } = await supabase
      .from("students")
      .update({
        is_active: body.is_active
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return listStudents(supabase);
  }

  return NextResponse.json(
    { error: "Acao invalida" },
    { status: 400 }
  );
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { id } = await context.params;

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return listStudents(supabase);
}
