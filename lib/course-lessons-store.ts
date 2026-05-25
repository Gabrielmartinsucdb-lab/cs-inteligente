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

function readLocalLessons() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(localStorageKey);
    return raw ? (JSON.parse(raw) as CourseLesson[]) : [];
  } catch {
    return [];
  }
}

function writeLocalLessons(lessons: CourseLesson[]) {
  window.localStorage.setItem(localStorageKey, JSON.stringify(lessons));
}

function sortLessons(lessons: CourseLesson[]) {
  return [...lessons].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function createLocalLesson(payload: LessonPayload): CourseLesson {
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

export async function listCourseLessons(): Promise<LessonStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) return { data: (data ?? []) as CourseLesson[], source: "supabase" };
  }

  return { data: sortLessons(readLocalLessons()), source: "local" };
}

export async function saveCourseLesson(
  payload: LessonPayload,
  id?: string | null
): Promise<LessonStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = id
      ? await supabase.from("course_lessons").update(payload).eq("id", id)
      : await supabase.from("course_lessons").insert(payload);

    if (!error) return listCourseLessons();
  }

  const current = readLocalLessons();
  const next = id
    ? current.map((lesson) => (lesson.id === id ? { ...lesson, ...payload } : lesson))
    : [createLocalLesson(payload), ...current];

  writeLocalLessons(next);
  return { data: sortLessons(next), source: "local" };
}

export async function deleteCourseLesson(id: string): Promise<LessonStoreResult> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.from("course_lessons").delete().eq("id", id);

    if (!error) return listCourseLessons();
  }

  const next = readLocalLessons().filter((lesson) => lesson.id !== id);
  writeLocalLessons(next);
  return { data: sortLessons(next), source: "local" };
}
