"use client";

import { createClient } from "@/lib/supabase-browser";

export type MessageTemplate = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

type TemplatePayload = {
  title: string;
  content: string;
};

export type TemplateStoreResult<T> = {
  data: T;
  source: "supabase" | "local";
};

const localStorageKey = "cs_message_templates";

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

function readLocalTemplates() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? (JSON.parse(raw) as MessageTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeLocalTemplates(templates: MessageTemplate[]) {
  window.localStorage.setItem(localStorageKey, JSON.stringify(templates));
}

function sortTemplates(templates: MessageTemplate[]) {
  return [...templates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function createLocalTemplate(payload: TemplatePayload) {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    content: payload.content,
    created_at: new Date().toISOString()
  };
}

export async function listMessageTemplates(): Promise<TemplateStoreResult<MessageTemplate[]>> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) return { data: (data ?? []) as MessageTemplate[], source: "supabase" };
  }

  return { data: sortTemplates(readLocalTemplates()), source: "local" };
}

export async function saveMessageTemplate(
  payload: TemplatePayload,
  id?: string | null
): Promise<TemplateStoreResult<MessageTemplate[]>> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = id
      ? await supabase.from("message_templates").update(payload).eq("id", id)
      : await supabase.from("message_templates").insert(payload);

    if (!error) return listMessageTemplates();
  }

  const current = readLocalTemplates();
  const next = id
    ? current.map((template) =>
        template.id === id ? { ...template, title: payload.title, content: payload.content } : template
      )
    : [createLocalTemplate(payload), ...current];

  writeLocalTemplates(next);
  return { data: sortTemplates(next), source: "local" };
}

export async function duplicateMessageTemplate(
  template: MessageTemplate
): Promise<TemplateStoreResult<MessageTemplate[]>> {
  return saveMessageTemplate({
    title: `${template.title} - cópia`,
    content: template.content
  });
}

export async function deleteMessageTemplate(
  id: string
): Promise<TemplateStoreResult<MessageTemplate[]>> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.from("message_templates").delete().eq("id", id);

    if (!error) return listMessageTemplates();
  }

  const next = readLocalTemplates().filter((template) => template.id !== id);
  writeLocalTemplates(next);
  return { data: sortTemplates(next), source: "local" };
}
