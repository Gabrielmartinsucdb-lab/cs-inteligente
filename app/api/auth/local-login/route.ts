import { NextResponse } from "next/server";
import { isLocalAdmin, LOCAL_ADMIN } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { login, password } = (await request.json()) as {
    login?: string;
    password?: string;
  };

  if (!isLocalAdmin(login ?? "", password ?? "")) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const session = {
    id: "local-admin",
    name: LOCAL_ADMIN.login,
    login: LOCAL_ADMIN.login,
    is_admin: true,
    can_create_templates: true
  };

  response.cookies.set(LOCAL_ADMIN.cookieName, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set(LOCAL_ADMIN.userCookieName, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set("cs_user_session", encodeURIComponent(JSON.stringify(session)), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
