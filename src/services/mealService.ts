import { EMPTY_COMPONENTS } from "@/lib/analytics";
import type { Database } from "@/lib/supabase/database.types";
import type {
  HungerBefore,
  MealAfter,
  MealComponents,
  MealEntry,
  MealKind,
  ServedQuantity,
  SnackingAfter,
  StopReason,
} from "@/lib/types";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type MealRow = Database["public"]["Tables"]["meal_observations"]["Row"];
type MealTagRow = Database["public"]["Tables"]["meal_observation_tags"]["Row"];

const componentKeys = Object.keys(EMPTY_COMPONENTS) as Array<keyof MealComponents>;

function observedAt(date: string, time: string): string {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  return new Date(`${date}T${safeTime}:00`).toISOString();
}

function dateFromTimestamp(value: string): string {
  return value.slice(0, 10);
}

function timeFromTimestamp(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateFromMealRow(row: MealRow): string {
  return row.observed_date ?? dateFromTimestamp(row.observed_at);
}

function timeFromMealRow(row: MealRow): string {
  return row.observed_time ?? timeFromTimestamp(row.observed_at);
}

function normalizeMealKind(value: string | null): MealKind {
  return value === "dejeuner" || value === "diner" || value === "collation" || value === "autre"
    ? value
    : "autre";
}

function normalizeQuantity(value: string | null): ServedQuantity {
  return value === "reasonable-plate" ||
    value === "loaded-plate" ||
    value === "two-plates" ||
    value === "three-plus-plates"
    ? value
    : "reasonable-plate";
}

function normalizeHunger(value: string | null): HungerBefore {
  return value === "pas-faim" ||
    value === "petite-faim" ||
    value === "vraie-faim" ||
    value === "tres-faim"
    ? value
    : "vraie-faim";
}

function normalizeAfter(value: string | null): MealAfter {
  return value === "encore-faim" ||
    value === "satisfait" ||
    value === "trop-plein" ||
    value === "inconfortable"
    ? value
    : "satisfait";
}

function normalizeStopReason(value: string | null): StopReason {
  return value === "rassasie" ||
    value === "assiette-vide" ||
    value === "arret-volontaire" ||
    value === "contrainte-exterieure"
    ? value
    : "rassasie";
}

function normalizeSnacking(value: string | null): SnackingAfter {
  return value === "non" || value === "oui-leger" || value === "oui-important"
    ? value
    : "non";
}

function componentsFromTags(tags: string[]): MealComponents {
  return componentKeys.reduce<MealComponents>(
    (components, key) => ({
      ...components,
      [key]: tags.includes(key),
    }),
    { ...EMPTY_COMPONENTS },
  );
}

function tagsFromComponents(components: MealComponents): string[] {
  return componentKeys.filter((key) => components[key]);
}

function fromMealRow(row: MealRow, tags: string[]): MealEntry {
  return {
    id: row.id,
    date: dateFromMealRow(row),
    time: timeFromMealRow(row),
    kind: normalizeMealKind(row.meal_type),
    freeText: row.raw_text ?? "",
    quantity: normalizeQuantity(row.quantity_served),
    hungerBefore: normalizeHunger(row.hunger_before),
    afterMeal: normalizeAfter(row.fullness_after),
    stopReason: normalizeStopReason(row.stop_reason),
    snackingAfter: normalizeSnacking(row.post_meal_snacking),
    components: componentsFromTags(tags),
    finding: {
      fact: row.immediate_constat ?? "Observation ajoutée.",
      reading: row.immediate_reading ?? "",
      nextAction: row.immediate_next_action ?? "",
      frictionPoint: row.main_signal ?? "observation",
      evidenceLevel: "observation unique",
    },
    createdAt: row.created_at,
  };
}

export async function listMealObservations(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<MealEntry[]> {
  const { data: meals, error } = await supabase
    .from("meal_observations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  throwIfSupabaseError(error);

  const observationIds = (meals ?? []).map((meal) => meal.id);

  if (observationIds.length === 0) {
    return [];
  }

  const { data: tags, error: tagsError } = await supabase
    .from("meal_observation_tags")
    .select("*")
    .eq("user_id", userId)
    .in("observation_id", observationIds);

  throwIfSupabaseError(tagsError);

  const tagsByObservation = new Map<string, string[]>();
  (tags ?? []).forEach((tag: MealTagRow) => {
    tagsByObservation.set(tag.observation_id, [
      ...(tagsByObservation.get(tag.observation_id) ?? []),
      tag.tag,
    ]);
  });

  return (meals ?? []).map((meal) =>
    fromMealRow(meal, tagsByObservation.get(meal.id) ?? []),
  );
}

export async function upsertMealObservations(
  supabase: AppSupabaseClient,
  userId: string,
  meals: MealEntry[],
): Promise<void> {
  for (const meal of meals) {
    const { data, error } = await supabase
      .from("meal_observations")
      .upsert(
        {
          user_id: userId,
          observed_at: observedAt(meal.date, meal.time),
          observed_date: meal.date,
          observed_time: meal.time,
          meal_type: meal.kind,
          raw_text: meal.freeText,
          quantity_served: meal.quantity,
          hunger_before: meal.hungerBefore,
          fullness_after: meal.afterMeal,
          stop_reason: meal.stopReason,
          post_meal_snacking: meal.snackingAfter,
          main_signal: meal.finding.frictionPoint,
          immediate_constat: meal.finding.fact,
          immediate_reading: meal.finding.reading,
          immediate_next_action: meal.finding.nextAction,
          created_at: meal.createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,created_at" },
      )
      .select("id")
      .single();

    throwIfSupabaseError(error);

    if (!data) {
      continue;
    }

    const { error: deleteError } = await supabase
      .from("meal_observation_tags")
      .delete()
      .eq("user_id", userId)
      .eq("observation_id", data.id);

    throwIfSupabaseError(deleteError);

    const tags = tagsFromComponents(meal.components);

    if (tags.length === 0) {
      continue;
    }

    const { error: insertError } = await supabase
      .from("meal_observation_tags")
      .insert(
        tags.map((tag) => ({
          observation_id: data.id,
          user_id: userId,
          tag,
        })),
      );

    throwIfSupabaseError(insertError);
  }
}

export async function deleteMealObservations(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("meal_observations")
    .delete()
    .eq("user_id", userId);

  throwIfSupabaseError(error);
}
