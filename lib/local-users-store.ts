"use client";

export type LocalUser = {
  id: string;
  name: string;
  login: string;
  password: string;
  role: "user";
  created_at: string;
};

export type LocalUserPayload = {
  name: string;
  login: string;
  password: string;
};

const localStorageKey = "cs_local_users";

export function listLocalUsers() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalUser(payload: LocalUserPayload) {
  const current = listLocalUsers();
  const login = payload.login.trim();
  const existing = current.find((user) => user.login.toLowerCase() === login.toLowerCase());

  const next = existing
    ? current.map((user) =>
        user.id === existing.id
          ? { ...user, name: payload.name.trim(), login, password: payload.password }
          : user
      )
    : [
        {
          id: crypto.randomUUID(),
          name: payload.name.trim(),
          login,
          password: payload.password,
          role: "user" as const,
          created_at: new Date().toISOString()
        },
        ...current
      ];

  window.localStorage.setItem(localStorageKey, JSON.stringify(next));
  return next;
}

export function deleteLocalUser(id: string) {
  const next = listLocalUsers().filter((user) => user.id !== id);
  window.localStorage.setItem(localStorageKey, JSON.stringify(next));
  return next;
}

export function findLocalUser(login: string, password: string) {
  return listLocalUsers().find(
    (user) => user.login.toLowerCase() === login.trim().toLowerCase() && user.password === password
  );
}
