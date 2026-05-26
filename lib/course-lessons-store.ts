"use client";

import { createClient } from "@/lib/supabase-browser";

export type CourseLesson = {
  id: string;
  title: string;
  ai_tool: string;
  category: string;
  link: string;
  tags: string;
  created_at: string;
};

type LessonPayload = {
  title: string;
  ai_tool: string;
  category: string;
  link: string;
  tags: string;
};

export type LessonStoreResult = {
  data: CourseLesson[];
  source: "supabase" | "local";
};

const localStorageKey = "cs_course_lessons";

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
 * LOCAL FALLBACK
 * =========================================
 */

function readLocalLessons(): CourseLesson[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(localStorageKey);

    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("LOCAL READ ERROR:", error);
    return [];
  }
}

function writeLocalLessons(
  lessons: CourseLesson[]
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify(lessons)
    );
  } catch (error) {
    console.error("LOCAL WRITE ERROR:", error);
  }
}

function clearLocalLessons() {
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

function sortLessons(
  lessons: CourseLesson[]
) {
  return [...lessons].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
}

function createLocalLesson(
  payload: LessonPayload
): CourseLesson {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    ai_tool: payload.ai_tool,
    category: payload.category,
    link: payload.link,
    tags: payload.tags,
    created_at: new Date().toISOString()
  };
}

/**
 * =========================================
 * TEST CONNECTION
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
      .from("course_lessons")
      .select("*")
      .limit(1);

    console.log(
      "COURSE LESSON TEST DATA:",
      data
    );

    console.log(
      "COURSE LESSON TEST ERROR:",
      error
    );
  } catch (error) {
    console.error(
      "COURSE LESSON CONNECTION FAILURE:",
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

export async function listCourseLessons(): Promise<LessonStoreResult> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log(
      "LISTANDO AULAS DO SUPABASE"
    );

    const supabase = createClient();

    const { data, error } = await supabase
      .from("course_lessons")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    console.log("LESSON SELECT DATA:", data);
    console.log("LESSON SELECT ERROR:", error);

    if (error) {
      throw error;
    }

    const lessons =
      (data ?? []) as CourseLesson[];

    writeLocalLessons(lessons);

    return {
      data: lessons,
      source: "supabase"
    };
  } catch (error) {
    console.error(
      "LIST COURSE LESSON FAILURE:",
      error
    );

    const localLessons =
      sortLessons(readLocalLessons());

    return {
      data: localLessons,
      source: "local"
    };
  }
}

/**
 * =========================================
 * SAVE
 * =========================================
 */

export async function saveCourseLesson(
  payload: LessonPayload,
  id?: string | null
): Promise<LessonStoreResult> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log("SALVANDO AULA");

    const supabase = createClient();

    if (id) {
      const { data, error } = await supabase
        .from("course_lessons")
        .update({
          title: payload.title,
          ai_tool: payload.ai_tool,
          category: payload.category,
          link: payload.link,
          tags: payload.tags
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
        .from("course_lessons")
        .insert({
          title: payload.title,
          ai_tool: payload.ai_tool,
          category: payload.category,
          link: payload.link,
          tags: payload.tags
        })
        .select();

      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);

      if (error) {
        throw error;
      }
    }

    return await listCourseLessons();
  } catch (error) {
    console.error(
      "SAVE COURSE LESSON FAILURE:",
      error
    );

    console.warn(
      "FALLBACK LOCAL DE AULAS"
    );

    const current = readLocalLessons();

    const next = id
      ? current.map((lesson) =>
          lesson.id === id
            ? {
                ...lesson,
                ...payload
              }
            : lesson
        )
      : [
          createLocalLesson(payload),
          ...current
        ];

    writeLocalLessons(next);

    return {
      data: sortLessons(next),
      source: "local"
    };
  }
}

/**
 * =========================================
 * DELETE
 * =========================================
 */

export async function deleteCourseLesson(
  id: string
): Promise<LessonStoreResult> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error(
        "Supabase não configurado"
      );
    }

    console.log("DELETANDO AULA");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("course_lessons")
      .delete()
      .eq("id", id)
      .select();

    console.log("DELETE DATA:", data);
    console.log("DELETE ERROR:", error);

    if (error) {
      throw error;
    }

    return await listCourseLessons();
  } catch (error) {
    console.error(
      "DELETE COURSE LESSON FAILURE:",
      error
    );

    const next = readLocalLessons().filter(
      (lesson) => lesson.id !== id
    );

    writeLocalLessons(next);

    return {
      data: sortLessons(next),
      source: "local"
    };
  }
}

/**
 * =========================================
 * FORCE SYNC
 * =========================================
 */

export async function forceSyncLessons() {
  try {
    clearLocalLessons();

    return await listCourseLessons();
  } catch (error) {
    console.error(
      "FORCE SYNC LESSON ERROR:",
      error
    );

    throw error;
  }
}