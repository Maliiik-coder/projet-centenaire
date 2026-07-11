import type {
  FrictionChoice,
  Profile,
  SmokingGoal,
  SmokingStatus,
} from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

function normalizeFriction(value: string | null): FrictionChoice {
  return value === "large-portions" ||
    value === "snacking-without-hunger" ||
    value === "habit-meals" ||
    value === "low-activity" ||
    value === "irregularity" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeSmokingStatus(value: string | null): SmokingStatus {
  return value === "non" ||
    value === "occasionnellement" ||
    value === "tous-les-jours" ||
    value === "arrete"
    ? value
    : "non";
}

function normalizeSmokingGoal(value: string | null): SmokingGoal | undefined {
  return value === "arreter" ||
    value === "reduire" ||
    value === "observer" ||
    value === "pas-maintenant"
    ? value
    : undefined;
}

function fromProfileRow(row: ProfileRow): Profile {
  return {
    firstName: row.first_name ?? "",
    age: row.age ?? 0,
    heightCm: row.height_cm ?? 0,
    startWeightKg: Number(row.start_weight_kg ?? 0),
    goalWeightKg: Number(row.goal_weight_kg ?? 0),
    startDate: row.start_date ?? "",
    initialFriction: normalizeFriction(row.initial_friction),
    smokingStatus: normalizeSmokingStatus(row.smoking_status),
    smokingGoal: normalizeSmokingGoal(row.smoking_goal),
    weeklyActivityGoal: 5,
    createdAt: row.created_at,
  };
}

function toProfileInsert(userId: string, profile: Profile): ProfileInsert {
  const smokingEnabled =
    profile.smokingStatus !== "non" &&
    profile.smokingGoal !== undefined &&
    profile.smokingGoal !== "pas-maintenant";

  return {
    user_id: userId,
    first_name: profile.firstName,
    age: profile.age,
    height_cm: profile.heightCm,
    start_weight_kg: profile.startWeightKg,
    goal_weight_kg: profile.goalWeightKg,
    start_date: profile.startDate,
    smoking_enabled: smokingEnabled,
    smoking_status: profile.smokingStatus,
    smoking_goal: profile.smokingGoal ?? null,
    initial_friction: profile.initialFriction,
    created_at: profile.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export async function getProfile(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  throwIfSupabaseError(error);

  return data ? fromProfileRow(data) : null;
}

export async function upsertProfile(
  supabase: AppSupabaseClient,
  userId: string,
  profile: Profile,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert(toProfileInsert(userId, profile), { onConflict: "user_id" });

  throwIfSupabaseError(error);
}

export async function deleteProfile(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

  throwIfSupabaseError(error);
}
