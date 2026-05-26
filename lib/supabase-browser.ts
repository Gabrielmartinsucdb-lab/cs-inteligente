"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log("SUPABASE URL:", supabaseUrl);
  console.log(
    "SUPABASE KEY EXISTS:",
    !!supabaseAnonKey
  );

  return createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey
  );
}