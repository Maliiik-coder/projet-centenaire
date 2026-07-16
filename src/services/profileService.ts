import type {
  FrictionChoice,
  Profile,
  ProfilePatch,
  SmokingGoal,
  SmokingStatus,
} from "@/lib/types";
import { normalizeInitialBehaviorAssessment } from "@/lib/onboarding";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

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
  return value === "non-renseigne" ||
    value === "non" ||
    value === "occasionnellement" ||
    value === "tous-les-jours" ||
    value === "arrete"
    ? value
    : "non-renseigne";
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
    initialBehaviorAssessment: normalizeInitialBehaviorAssessment(
      row.initial_behavior_assessment,
    ),
    smokingStatus: normalizeSmokingStatus(row.smoking_status),
    smokingGoal: normalizeSmokingGoal(row.smoking_goal),
    showActiveMission: row.show_active_mission ?? true,
    darkMode: row.dark_mode ?? false,
    weeklyActivityGoal: 5,
    createdAt: row.created_at,
  };
}

function toProfileInsert(userId: string, profile: Profile): ProfileInsert {
  const smokingEnabled =
    profile.smokingStatus !== "non-renseigne" &&
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
    initial_behavior_assessment:
      (profile.initialBehaviorAssessment as unknown as Json | undefined) ?? null,
    show_active_mission: profile.showActiveMission,
    dark_mode: profile.darkMode,
    created_at: profile.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function buildProfileUpdatePayload(patch: ProfilePatch): ProfileUpdate {
  const payload: ProfileUpdate = { updated_at: new Date().toISOString() };

  if (hasOwn(patch, "firstName")) payload.first_name = patch.firstName;
  if (hasOwn(patch, "age")) payload.age = patch.age;
  if (hasOwn(patch, "heightCm")) payload.height_cm = patch.heightCm;
  if (hasOwn(patch, "startWeightKg")) {
    payload.start_weight_kg = patch.startWeightKg;
  }
  if (hasOwn(patch, "goalWeightKg")) {
    payload.goal_weight_kg = patch.goalWeightKg;
  }
  if (hasOwn(patch, "startDate")) payload.start_date = patch.startDate;
  if (hasOwn(patch, "smokingStatus")) {
    payload.smoking_status = patch.smokingStatus;
  }
  if (hasOwn(patch, "smokingGoal")) {
    payload.smoking_goal = patch.smokingGoal ?? null;
  }
  if (hasOwn(patch, "initialFriction")) {
    payload.initial_friction = patch.initialFriction;
  }
  if (hasOwn(patch, "initialBehaviorAssessment")) {
    payload.initial_behavior_assessment =
      (patch.initialBehaviorAssessment as unknown as Json | undefined) ?? null;
  }
  if (hasOwn(patch, "showActiveMission")) {
    payload.show_active_mission = patch.showActiveMission;
  }
  if (hasOwn(patch, "darkMode")) payload.dark_mode = patch.darkMode;

  return payload;
}

function toProfileCreateInsert(
  userId: string,
  patch: ProfilePatch,
): ProfileInsert {
  const update = buildProfileUpdatePayload(patch);
  return {
    user_id: userId,
    first_name: update.first_name,
    age: update.age,
    height_cm: update.height_cm,
    start_weight_kg: update.start_weight_kg,
    goal_weight_kg: update.goal_weight_kg,
    start_date: update.start_date,
    smoking_status: update.smoking_status,
    smoking_goal: update.smoking_goal,
    initial_friction: update.initial_friction,
    initial_behavior_assessment: update.initial_behavior_assessment,
    show_active_mission: update.show_active_mission,
    dark_mode: update.dark_mode,
    created_at: patch.createdAt,
    updated_at: update.updated_at,
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

export async function createProfileIfMissing(
  supabase: AppSupabaseClient,
  userId: string,
  patch: ProfilePatch,
  signal?: AbortSignal,
): Promise<void> {
  const query = supabase
    .from("profiles")
    .upsert(toProfileCreateInsert(userId, patch), {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
  const { error } = signal ? await query.abortSignal(signal) : await query;

  throwIfSupabaseError(error);
}

export async function patchProfile(
  supabase: AppSupabaseClient,
  userId: string,
  patch: ProfilePatch,
  signal?: AbortSignal,
): Promise<void> {
  const query = supabase
    .from("profiles")
    .update(buildProfileUpdatePayload(patch))
    .eq("user_id", userId)
    .select("user_id");
  const { data, error } = signal
    ? await query.abortSignal(signal)
    : await query;

  throwIfSupabaseError(error);

  if (!data || data.length === 0) {
    throw new Error("Le profil à modifier n’existe pas encore dans le cloud.");
  }
}

export async function deleteProfile(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

  throwIfSupabaseError(error);
}
