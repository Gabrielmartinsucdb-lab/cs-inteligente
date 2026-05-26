import { NextResponse } from "next/server";

export async function POST(
  request: Request
) {
  const body =
    await request.json();

  const session =
    encodeURIComponent(
      JSON.stringify(body)
    );

  const response =
    NextResponse.json({
      ok: true
    });

  response.cookies.set(
    "cs_user_session",
    session,
    {
      httpOnly: false,

      secure: false,

      sameSite: "lax",

      path: "/",

      maxAge:
        60 *
        60 *
        24 *
        7
    }
  );

  return response;
}