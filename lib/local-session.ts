export type LocalSessionUser = {
  id?: string;
  name?: string;
  login?: string;
  is_admin?: boolean;
  can_create_templates?: boolean;
};

export function parseLocalSession(
  value?: string
): LocalSessionUser | null {
  if (!value) return null;

  try {
    return JSON.parse(
      decodeURIComponent(value)
    ) as LocalSessionUser;
  } catch {
    try {
      return JSON.parse(value) as LocalSessionUser;
    } catch {
      return null;
    }
  }
}

export function canAccessTemplates(
  session: LocalSessionUser | null
) {
  return Boolean(
    session?.is_admin ||
      session?.can_create_templates
  );
}

export function canAccessUsers(
  session: LocalSessionUser | null
) {
  return Boolean(session?.is_admin);
}
