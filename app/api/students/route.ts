import { createClient } from "@supabase/supabase-js";
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
  return {
    mentorship: payload.mentorship?.trim() ?? "",
    name: payload.name?.trim() ?? "",
    phone: payload.phone?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    cs_responsible:
      payload.cs_responsible?.trim() ?? "",
    is_active: payload.is_active ?? true,
    updated_at: new Date().toISOString()
  };
}

export async function GET() {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

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

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
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
    .insert({
      ...payload,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return GET();
}
