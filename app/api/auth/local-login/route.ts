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
  response.cookies.set(LOCAL_ADMIN.cookieName, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
