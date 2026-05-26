export type SessionUser = {
  id: string;
  name: string;
  login: string;
  is_admin: boolean;
  can_create_templates: boolean;
};

export function getSessionUser():
  | SessionUser
  | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie =
    document.cookie
      .split("; ")
      .find((row) =>
        row.startsWith(
          "cs_user_session="
        )
      );

  if (!cookie) {
    return null;
  }

  try {
    const value =
      decodeURIComponent(
        cookie.split("=")[1]
      );

    return JSON.parse(value);
  } catch (error) {
    console.error(
      "ERRO SESSION USER:",
      error
    );

    return null;
  }
}