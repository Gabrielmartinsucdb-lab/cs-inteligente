"use client";

import { createClient } from "@/lib/supabase-browser";

export type GptItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  link: string;
  created_at: string;
};

type GptPayload = {
  title: string;
  category: string;
  description: string;
  link: string;
};

export type GptStoreResult = {
  data: GptItem[];
  source: "supabase" | "local";
};

const localStorageKey = "cs_gpts";

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      !url.includes("example.supabase.co") &&
      !url.includes("SEU-PROJETO") &&
      !key.includes("SUA_CHAVE")
  );
}

function readLocalGpts() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? (JSON.parse(raw) as GptItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalGpts(items: GptItem[]) {
  window.localStorage.setItem(localStorageKey, JSON.stringify(items));
}

function sortGpts(items: GptItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function createLocalGpt(payload: GptPayload): GptItem {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    category: payload.category,
    description: payload.description,
    link: payload.link,
    created_at: new Date().toISOString()
  };
}

export async function listGpts(): Promise<GptStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("gpts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) return { data: (data ?? []) as GptItem[], source: "supabase" };
  }

  return { data: sortGpts(readLocalGpts()), source: "local" };
}

export async function saveGpt(payload: GptPayload, id?: string | null): Promise<GptStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = id
      ? await supabase.from("gpts").update(payload).eq("id", id)
      : await supabase.from("gpts").insert(payload);

    if (!error) return listGpts();
  }

  const current = readLocalGpts();
  const next = id
    ? current.map((item) => (item.id === id ? { ...item, ...payload } : item))
    : [createLocalGpt(payload), ...current];

  writeLocalGpts(next);
  return { data: sortGpts(next), source: "local" };
}

export async function deleteGpt(id: string): Promise<GptStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.from("gpts").delete().eq("id", id);

    if (!error) return listGpts();
  }

  const next = readLocalGpts().filter((item) => item.id !== id);
  writeLocalGpts(next);
  return { data: sortGpts(next), source: "local" };
}
