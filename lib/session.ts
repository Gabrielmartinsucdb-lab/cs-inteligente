import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    id,
    name,
    login,
    is_admin,
    can_create_templates
  } = body;

  if (!login) {
    return NextResponse.json(
      {
        error: "Credenciais inválidas"
      },
      {
        status: 401
      }
    );
  }

  const response = NextResponse.json({
    ok: true
  });

  response.cookies.set(
    "cs_user_session",
    JSON.stringify({
      id,
      name,
      login,
      is_admin,
      can_create_templates
    }),
    {
      httpOnly: false,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 * 60 * 24 * 7
    }
  );

  return response;
}