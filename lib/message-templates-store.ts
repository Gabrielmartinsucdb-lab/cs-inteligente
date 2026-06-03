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

async function requestTemplatesApi(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(
      `Templates API ${response.status}`
    );
  }

  return (await response.json()) as TemplateStoreResult<
    MessageTemplate[]
  >;
}

/**
 * =========================================
 * SUPABASE CONFIG
 * =========================================
 */

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("SUPABASE URL:", url);
  console.log("SUPABASE KEY EXISTS:", !!key);

  return !!url && !!key;
}

/**
 * =========================================
 * LOCAL STORAGE FALLBACK
 * =========================================
 */

function readLocalTemplates(): MessageTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(localStorageKey);

    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("LOCAL READ ERROR:", error);
    return [];
  }
}

function writeLocalTemplates(
  templates: MessageTemplate[]
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify(templates)
    );
  } catch (error) {
    console.error("LOCAL WRITE ERROR:", error);
  }
}

function clearLocalTemplates() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(localStorageKey);
  } catch (error) {
    console.error("LOCAL CLEAR ERROR:", error);
  }
}

/**
 * =========================================
 * HELPERS
 * =========================================
 */

function sortTemplates(
  templates: MessageTemplate[]
) {
  return [...templates].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
}

function createLocalTemplate(
  payload: TemplatePayload
): MessageTemplate {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    content: payload.content,
    created_at: new Date().toISOString()
  };
}

/**
 * =========================================
 * SUPABASE TEST
 * =========================================
 */

async function testSupabaseConnection() {
  try {
    if (!isSupabaseConfigured()) {
      console.warn(
        "SUPABASE NÃO CONFIGURADO"
      );

      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .limit(1);

    console.log(
      "SUPABASE TEST DATA:",
      data
    );

    console.log(
      "SUPABASE TEST ERROR:",
      error
    );
  } catch (error) {
    console.error(
      "SUPABASE CONNECTION FAILURE:",
      error
    );
  }
}

testSupabaseConnection();

/**
 * =========================================
 * LIST
 * =========================================
 */

export async function listMessageTemplates(): Promise<
  TemplateStoreResult<MessageTemplate[]>
> {
  try {
    const result = await requestTemplatesApi(
      "/api/templates"
    );

    writeLocalTemplates(result.data);

    return result;
  } catch (error) {
    console.error(
      "TEMPLATES API LIST FAILURE:",
      error
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log(
      "LISTANDO TEMPLATES DO SUPABASE"
    );

    const supabase = createClient();

    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    console.log("SELECT DATA:", data);
    console.log("SELECT ERROR:", error);

    if (error) {
      throw error;
    }

    const templates = (data ??
      []) as MessageTemplate[];

    /**
     * Atualiza local cache
     */
    writeLocalTemplates(templates);

    return {
      data: templates,
      source: "supabase"
    };
  } catch (error) {
    console.error(
      "LIST MESSAGE TEMPLATE FAILURE:",
      error
    );

    const localTemplates =
      sortTemplates(readLocalTemplates());

    return {
      data: localTemplates,
      source: "local"
    };
  }
}

/**
 * =========================================
 * SAVE
 * =========================================
 */

export async function saveMessageTemplate(
  payload: TemplatePayload,
  id?: string | null
): Promise<
  TemplateStoreResult<MessageTemplate[]>
> {
  try {
    const result = id
      ? await requestTemplatesApi(
          `/api/templates/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(payload)
          }
        )
      : await requestTemplatesApi(
          "/api/templates",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

    writeLocalTemplates(result.data);

    return result;
  } catch (error) {
    console.error(
      "TEMPLATES API SAVE FAILURE:",
      error
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log("SALVANDO NO SUPABASE");

    const supabase = createClient();

    if (id) {
      const { data, error } = await supabase
        .from("message_templates")
        .update({
          title: payload.title,
          content: payload.content
        })
        .eq("id", id)
        .select();

      console.log("UPDATE DATA:", data);
      console.log("UPDATE ERROR:", error);

      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await supabase
        .from("message_templates")
        .insert({
          title: payload.title,
          content: payload.content
        })
        .select();

      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);

      if (error) {
        throw error;
      }
    }

    /**
     * Recarrega do banco
     */
    return await listMessageTemplates();
  } catch (error) {
    console.error(
      "SAVE TEMPLATE FAILURE:",
      error
    );

    console.warn(
      "FALLBACK LOCAL ATIVADO"
    );

    /**
     * FALLBACK LOCAL
     */
    const current = readLocalTemplates();

    const next = id
      ? current.map((template) =>
          template.id === id
            ? {
                ...template,
                title: payload.title,
                content: payload.content
              }
            : template
        )
      : [
          createLocalTemplate(payload),
          ...current
        ];

    writeLocalTemplates(next);

    return {
      data: sortTemplates(next),
      source: "local"
    };
  }
}

/**
 * =========================================
 * DUPLICATE
 * =========================================
 */

export async function duplicateMessageTemplate(
  template: MessageTemplate
): Promise<
  TemplateStoreResult<MessageTemplate[]>
> {
  return saveMessageTemplate({
    title: `${template.title} - cópia`,
    content: template.content
  });
}

/**
 * =========================================
 * DELETE
 * =========================================
 */

export async function deleteMessageTemplate(
  id: string
): Promise<
  TemplateStoreResult<MessageTemplate[]>
> {
  try {
    const result = await requestTemplatesApi(
      `/api/templates/${id}`,
      {
        method: "DELETE"
      }
    );

    writeLocalTemplates(result.data);

    return result;
  } catch (error) {
    console.error(
      "TEMPLATES API DELETE FAILURE:",
      error
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log("DELETANDO NO SUPABASE");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", id)
      .select();

    console.log("DELETE DATA:", data);
    console.log("DELETE ERROR:", error);

    if (error) {
      throw error;
    }

    return await listMessageTemplates();
  } catch (error) {
    console.error(
      "DELETE TEMPLATE FAILURE:",
      error
    );

    console.warn(
      "DELETE LOCAL FALLBACK"
    );

    const next = readLocalTemplates().filter(
      (template) => template.id !== id
    );

    writeLocalTemplates(next);

    return {
      data: sortTemplates(next),
      source: "local"
    };
  }
}

/**
 * =========================================
 * FORCE SYNC
 * =========================================
 */

export async function forceSyncTemplates() {
  try {
    clearLocalTemplates();

    return await listMessageTemplates();
  } catch (error) {
    console.error(
      "FORCE SYNC ERROR:",
      error
    );

    throw error;
  }
}
