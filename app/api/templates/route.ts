import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LOCAL_ADMIN } from "@/lib/admin-auth";
import {
  canAccessTemplates,
  parseLocalSession
} from "@/lib/local-session";

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

async function hasTemplateAccess() {
  const cookieStore = await cookies();
  const localAdmin =
    cookieStore.get(LOCAL_ADMIN.cookieName)
      ?.value === "true";
  const session = parseLocalSession(
    cookieStore.get("cs_user_session")?.value
  );

  return (
    localAdmin ||
    canAccessTemplates(session)
  );
}

export async function GET() {
  if (!(await hasTemplateAccess())) {
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
    .from("message_templates")
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

export async function POST(request: Request) {
  if (!(await hasTemplateAccess())) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { title, content } =
    (await request.json()) as {
      title?: string;
      content?: string;
    };

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase nao configurado" },
      { status: 503 }
    );
  }

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "Titulo e conteudo sao obrigatorios" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("message_templates")
    .insert({
      title: title.trim(),
      content: content.trim()
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return GET();
}
