import { NextResponse } from "next/server";
import { LOCAL_ADMIN } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { ok } = (await request.json()) as { ok?: boolean };

  if (!ok) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_ADMIN.userCookieName, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
