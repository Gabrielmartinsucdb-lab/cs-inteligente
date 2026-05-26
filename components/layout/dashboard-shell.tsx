import { ReactNode } from "react";

import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";

import { Sidebar } from "@/components/layout/sidebar";

import { Topbar } from "@/components/layout/topbar";

type SessionUser = {
  id: string;

  name: string;

  login: string;

  is_admin: boolean;

  can_create_templates: boolean;
};

export async function DashboardShell({
  children
}: {
  children: ReactNode;
}) {
  const cookieStore =
    await cookies();

  const sessionCookie =
    cookieStore.get(
      "cs_user_session"
    )?.value;

  console.log(
    "COOKIE SESSION:",
    sessionCookie
  );

  if (!sessionCookie) {
    redirect("/login");
  }

  let user:
    | SessionUser
    | null = null;

  try {
    const decoded =
      decodeURIComponent(
        sessionCookie
      );

    user = JSON.parse(
      decoded
    );

    console.log(
      "USER SESSION:",
      user
    );
  } catch (error) {
    console.error(
      "ERRO PARSE SESSION:",
      error
    );

    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        isAdmin={
          user.is_admin
        }
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <main className="flex-1 p-4 pb-20 lg:p-8">
          {children}
        </main>

        <MobileNav
          isAdmin={
            user.is_admin
          }
        />
      </div>
    </div>
  );
}