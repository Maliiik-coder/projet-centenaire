import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

export function throwIfSupabaseError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}
