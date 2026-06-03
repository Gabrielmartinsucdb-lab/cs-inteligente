import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOCAL_ADMIN } from "@/lib/admin-auth";
import { canAccessUsers, parseLocalSession } from "@/lib/local-session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const localAdmin = cookieStore.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const session = parseLocalSession(cookieStore.get("cs_user_session")?.value);

  if (!localAdmin && !canAccessUsers(session)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { name, login, password } = (await request.json()) as {
    name?: string;
    login?: string;
    password?: string;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !login || !password) {
    return NextResponse.json({ ok: true, source: "local" });
  }

  const email = login.includes("@")
    ? login
    : `${login.trim().toLowerCase().replaceAll(" ", ".")}@cs-inteligente.local`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "user", login }
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, source: "supabase" });
}
