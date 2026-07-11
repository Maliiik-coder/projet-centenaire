"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient<Database> | null = null;

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return isValidHttpUrl(supabaseUrl) && Boolean(supabaseAnonKey);
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = supabaseUrl as string;
  const anonKey = supabaseAnonKey as string;

  try {
    browserClient ??= createBrowserClient<Database>(url, anonKey);
  } catch {
    return null;
  }

  return browserClient;
}
