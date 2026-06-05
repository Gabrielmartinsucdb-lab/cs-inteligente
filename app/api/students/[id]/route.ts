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

type StudentMeetingRow = {
  id: string;
  created_at: string;
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
    .order("updated_at", {
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

async function ensureStudentExists(
  supabase: SupabaseClient,
  id: string
) : Promise<NextResponse | undefined> {
  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Aluno nao encontrado" },
      { status: 404 }
    );
  }

  return undefined;
}

async function recalculateMeetingSummary(
  supabase: SupabaseClient,
  id: string
) {
  const { data, error } = await supabase
    .from("student_meetings")
    .select("id, created_at")
    .eq("student_id", id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  const meetings =
    (data ?? []) as StudentMeetingRow[];
  const lastMeetingAt =
    meetings[0]?.created_at ?? null;
  const meetingsCount = meetings.length;

  const { error: updateError } = await supabase
    .from("students")
    .update({
      last_meeting_at: lastMeetingAt,
      meetings_count: meetingsCount,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 }
    );
  }

  return null;
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

  const exists = await ensureStudentExists(
    supabase,
    id
  );

  if (exists) return exists;

  const { error } = await supabase
    .from("students")
    .update({
      ...payload,
      updated_at: new Date().toISOString()
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

  const exists = await ensureStudentExists(
    supabase,
    id
  );

  if (exists) return exists;

  if (body.action === "register_meeting") {
    const { error: insertError } =
      await supabase
        .from("student_meetings")
        .insert({
          student_id: id
        });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    const recalculationError =
      await recalculateMeetingSummary(
        supabase,
        id
      );

    if (recalculationError) {
      return recalculationError;
    }

    return listStudents(supabase);
  }

  if (body.action === "undo_meeting") {
    const { data: meeting, error: readError } =
      await supabase
        .from("student_meetings")
        .select("id")
        .eq("student_id", id)
        .order("created_at", {
          ascending: false
        })
        .limit(1)
        .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { error: readError.message },
        { status: 400 }
      );
    }

    if (!meeting) {
      const { data: currentStudent, error: currentError } =
        await supabase
          .from("students")
          .select("meetings_count, last_meeting_at")
          .eq("id", id)
          .maybeSingle();

      if (currentError) {
        return NextResponse.json(
          { error: currentError.message },
          { status: 400 }
        );
      }

      const currentCount = Number(
        currentStudent?.meetings_count ?? 0
      );

      if (currentCount <= 0) {
        return NextResponse.json(
          { error: "Nenhuma reuniao para desfazer" },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({
          meetings_count: currentCount - 1,
          last_meeting_at:
            currentCount - 1 <= 0
              ? null
              : currentStudent?.last_meeting_at ?? null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      return listStudents(supabase);
    }

    const { error: deleteError } = await supabase
      .from("student_meetings")
      .delete()
      .eq("id", meeting.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    const recalculationError =
      await recalculateMeetingSummary(
        supabase,
        id
      );

    if (recalculationError) {
      return recalculationError;
    }

    return listStudents(supabase);
  }

  if (body.is_active !== undefined) {
    const { error } = await supabase
      .from("students")
      .update({
        is_active: body.is_active,
        updated_at: new Date().toISOString()
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

  const exists = await ensureStudentExists(
    supabase,
    id
  );

  if (exists) return exists;

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
