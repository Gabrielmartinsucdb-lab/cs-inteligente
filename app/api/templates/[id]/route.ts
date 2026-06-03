import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { LOCAL_ADMIN } from "@/lib/admin-auth";
import {
  canAccessTemplates,
  canAccessUsers,
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

async function getPermissions() {
  const cookieStore = await cookies();
  const localAdmin =
    cookieStore.get(LOCAL_ADMIN.cookieName)
      ?.value === "true";
  const session = parseLocalSession(
    cookieStore.get("cs_user_session")?.value
  );

  return {
    canWrite:
      localAdmin ||
      canAccessTemplates(session),
    canDelete:
      localAdmin ||
      canAccessUsers(session)
  };
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const permissions = await getPermissions();

  if (!permissions.canWrite) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { id } = await context.params;
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
    .update({
      title: title.trim(),
      content: content.trim()
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  const { data, error: listError } =
    await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (listError) {
    return NextResponse.json(
      { error: listError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    source: "supabase"
  });
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const permissions = await getPermissions();

  if (!permissions.canDelete) {
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
    .from("message_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  const { data, error: listError } =
    await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (listError) {
    return NextResponse.json(
      { error: listError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    source: "supabase"
  });
}
