import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isLocalAdmin, LOCAL_ADMIN } from "@/lib/admin-auth";

type LoginBody = {
  login?: string;
  password?: string;
};

type SessionUser = {
  id: string;
  name: string;
  login: string;
  is_admin: boolean;
  can_create_templates: boolean;
};

const sessionMaxAge = 60 * 60 * 24 * 7;

function setLocalSession(
  response: NextResponse,
  user: SessionUser,
  isAdminCookie: boolean
) {
  response.cookies.set(
    "cs_user_session",
    encodeURIComponent(JSON.stringify(user)),
    {
      httpOnly: false,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAge
    }
  );

  response.cookies.set(
    LOCAL_ADMIN.userCookieName,
    "true",
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAge
    }
  );

  response.cookies.set(
    LOCAL_ADMIN.cookieName,
    isAdminCookie ? "true" : "",
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge: isAdminCookie
        ? sessionMaxAge
        : 0
    }
  );
}

function createSupabaseAuthClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceRoleKey || anonKey;

  if (!supabaseUrl || !key) {
    return null;
  }

  return createClient(
    supabaseUrl,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function POST(request: Request) {
  const { login = "", password = "" } =
    (await request.json()) as LoginBody;

  const cleanLogin = login.trim();
  const cleanPassword = password.trim();

  if (!cleanLogin || !cleanPassword) {
    return NextResponse.json(
      { error: "Informe login e senha." },
      { status: 400 }
    );
  }

  if (isLocalAdmin(cleanLogin, cleanPassword)) {
    const user: SessionUser = {
      id: "local-admin",
      name: LOCAL_ADMIN.login,
      login: LOCAL_ADMIN.login,
      is_admin: true,
      can_create_templates: true
    };

    const response = NextResponse.json({
      ok: true,
      user,
      source: "local-admin"
    });

    setLocalSession(response, user, true);

    return response;
  }

  const supabase = createSupabaseAuthClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Login indisponivel. Verifique as variaveis do Supabase."
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .select(
      "id,name,login,password,is_admin,can_create_templates,created_at"
    )
    .ilike("login", cleanLogin)
    .eq("password", cleanPassword)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao validar acesso." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Login ou senha invalidos." },
      { status: 401 }
    );
  }

  const user: SessionUser = {
    id: data.id,
    name: data.name,
    login: data.login,
    is_admin: Boolean(data.is_admin),
    can_create_templates: Boolean(
      data.can_create_templates
    )
  };

  const response = NextResponse.json({
    ok: true,
    user,
    source: "users"
  });

  setLocalSession(response, user, false);

  return response;
}
