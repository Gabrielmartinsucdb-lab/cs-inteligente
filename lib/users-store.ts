"use client";

import { createClient } from "@/lib/supabase-browser";

export type User = {
  id: string;
  name: string;
  login: string;
  password: string;
  role: "user";
  created_at: string;
};

export type UserPayload = {
  name: string;
  login: string;
  password: string;
};

const localStorageKey = "cs_local_users";

function writeLocal(users: User[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    localStorageKey,
    JSON.stringify(users)
  );
}

export async function listUsers() {
  if (typeof window === "undefined") return [];

  try {
    console.log("LISTANDO USERS...");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ERRO AO LISTAR USERS:", error);

      const raw =
        window.localStorage.getItem(localStorageKey);

      return raw ? JSON.parse(raw) : [];
    }

    console.log("USERS ENCONTRADOS:", data);

    writeLocal(data || []);

    return data || [];
  } catch (error) {
    console.error("ERRO GERAL LIST USERS:", error);

    const raw =
      window.localStorage.getItem(localStorageKey);

    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveUser(
  payload: UserPayload
) {
  try {
    console.log("SALVANDO USER:", payload);

    const supabase = createClient();

    const login = payload.login.trim();

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("login", login)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("users")
        .update({
          name: payload.name.trim(),
          login,
          password: payload.password
        })
        .eq("id", existing.id);

      if (error) {
        console.error(
          "ERRO AO ATUALIZAR USER:",
          error
        );

        return [];
      }
    } else {
      const { error } = await supabase
        .from("users")
        .insert({
          name: payload.name.trim(),
          login,
          password: payload.password,
          role: "user"
        });

      if (error) {
        console.error(
          "ERRO AO CRIAR USER:",
          error
        );

        return [];
      }
    }

    const updated = await listUsers();

    writeLocal(updated);

    return updated;
  } catch (error) {
    console.error("ERRO GERAL SAVE USER:", error);

    return [];
  }
}

export async function deleteUser(id: string) {
  try {
    console.log("REMOVENDO USER:", id);

    const supabase = createClient();

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "ERRO AO REMOVER USER:",
        error
      );

      return [];
    }

    const updated = await listUsers();

    writeLocal(updated);

    return updated;
  } catch (error) {
    console.error("ERRO GERAL DELETE USER:", error);

    return [];
  }
}

export async function findUser(
  login: string,
  password: string
) {
  try {
    console.log("BUSCANDO USER LOGIN:", login);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("login", login.trim())
      .eq("password", password)
      .maybeSingle();

    if (error) {
      console.error(
        "ERRO AO BUSCAR USER:",
        error
      );

      return null;
    }

    console.log("USER ENCONTRADO:", data);

    return data;
  } catch (error) {
    console.error("ERRO GERAL FIND USER:", error);

    return null;
  }
}