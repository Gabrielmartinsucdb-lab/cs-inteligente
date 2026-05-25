import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_ADMIN } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const localAdmin = request.cookies.get(LOCAL_ADMIN.cookieName)?.value === "true";
  const localUser = request.cookies.get(LOCAL_ADMIN.userCookieName)?.value === "true";
  const isSupabaseAdmin =
    user?.email === LOCAL_ADMIN.email || user?.user_metadata?.role === "admin";
  const isAdmin = localAdmin || isSupabaseAdmin;

  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const isProtected =
    request.nextUrl.pathname === "/" ||
    ["/dashboard", "/formatador", "/templates", "/aulas", "/gpts", "/alunos", "/usuarios"].some(
      (path) => request.nextUrl.pathname.startsWith(path)
    );
  const isAdminOnly =
    request.nextUrl.pathname.startsWith("/templates") ||
    request.nextUrl.pathname.startsWith("/usuarios");

  if (!user && !localAdmin && !localUser && isProtected && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminOnly && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if ((user || localAdmin || localUser) && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
