import type { WeeklyAnalysis } from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

export async function upsertWeeklyReport(
  supabase: AppSupabaseClient,
  userId: string,
  analysis: WeeklyAnalysis,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_reports")
    .upsert(
      {
        user_id: userId,
        week_start: analysis.weekStart,
        meals_count: analysis.mealCount,
        main_friction: analysis.frictionPoint,
        proof_level: analysis.priority.evidenceLevel,
        priority: analysis.priority.label,
        generated_text: analysis.priority.action,
      },
      { onConflict: "user_id,week_start" },
    );

  throwIfSupabaseError(error);
}

export async function deleteWeeklyReports(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("weekly_reports")
    .delete()
    .eq("user_id", userId);

  throwIfSupabaseError(error);
}
