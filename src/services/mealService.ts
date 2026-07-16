import { EMPTY_COMPONENTS } from "@/lib/analytics";
import { normalizeMealKind } from "@/lib/mealKinds";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  FullnessAfter,
  HungerBefore,
  MealClarification,
  MealAfter,
  MealComponents,
  MealEntry,
  MealStructureV2,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SnackTrigger,
  SnackingAfter,
  StopReason,
} from "@/lib/types";
import { canonicalizeTimestamp } from "@/lib/timestamps";
import type { AppSupabaseClient } from "@/services/serviceTypes";
import { throwIfSupabaseError } from "@/services/serviceTypes";

type MealRow = Database["public"]["Tables"]["meal_observations"]["Row"];
type MealInsert = Database["public"]["Tables"]["meal_observations"]["Insert"];
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
    value === "tres-faim" ||
    value === "yes" ||
    value === "not_really" ||
    value === "no" ||
    value === "unsure"
    ? value
    : "vraie-faim";
}

function normalizeAfter(value: string | null): MealAfter {
  return value === "encore-faim" ||
    value === "satisfait" ||
    value === "trop-plein" ||
    value === "inconfortable" ||
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
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

function normalizeServingPattern(
  value: string | null,
  legacyQuantity: ServedQuantity,
): ServingPattern {
  if (
    value === "none" ||
    value === "once" ||
    value === "multiple" ||
    value === "buffet"
  ) {
    return value;
  }

  if (legacyQuantity === "two-plates") {
    return "once";
  }

  if (legacyQuantity === "three-plus-plates") {
    return "multiple";
  }

  return "none";
}

function normalizeFullness(value: string | null, legacyAfter: MealAfter): FullnessAfter {
  if (
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
  ) {
    return value;
  }

  if (legacyAfter === "encore-faim") {
    return "still_hungry";
  }

  if (legacyAfter === "trop-plein") {
    return "too_full";
  }

  if (legacyAfter === "inconfortable") {
    return "uncomfortable";
  }

  return "fine";
}

function normalizeSnackTrigger(value: string | null): SnackTrigger | null {
  return value === "hunger" ||
    value === "boredom" ||
    value === "stress" ||
    value === "habit" ||
    value === "craving" ||
    value === "unsure"
    ? value
    : null;
}

function normalizeSnackContext(value: string | null): SnackContext | null {
  return value === "hotel" ||
    value === "car" ||
    value === "home" ||
    value === "work" ||
    value === "other"
    ? value
    : null;
}

function normalizeClarifications(value: Json | null): MealClarification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, Json | undefined> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      key: typeof item.key === "string" ? item.key : "clarification",
      question: typeof item.question === "string" ? item.question : "",
      value: typeof item.value === "string" ? item.value : null,
      customText: typeof item.customText === "string" ? item.customText : null,
    }));
}

function normalizeMealStructure(value: Json | null): MealStructureV2 | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "version" in value &&
    value.version === 2
  ) {
    return value as unknown as MealStructureV2;
  }

  return null;
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
  const quantity = normalizeQuantity(row.quantity_served);
  const afterMeal = normalizeAfter(row.fullness_after);
  const servingPattern = normalizeServingPattern(row.serving_pattern, quantity);
  const fullnessAfter = normalizeFullness(row.fullness_after, afterMeal);

  return {
    id: row.id,
    date: dateFromMealRow(row),
    time: timeFromMealRow(row),
    kind: normalizeMealKind(row.meal_type),
    freeText: row.raw_text ?? "",
    quantity,
    servingPattern,
    hungerBefore: normalizeHunger(row.hunger_before),
    afterMeal,
    fullnessAfter,
    stopReason: normalizeStopReason(row.stop_reason),
    snackingAfter: normalizeSnacking(row.post_meal_snacking),
    starterTaken: row.starter_taken === true,
    starterText: row.starter_text ?? null,
    dessertTaken: row.dessert_taken === true,
    dessertText: row.dessert_text ?? null,
    snackTrigger: normalizeSnackTrigger(row.snack_trigger),
    snackContext: normalizeSnackContext(row.snack_context),
    clarifications: normalizeClarifications(row.clarifications),
    questionnaireVersion:
      row.questionnaire_version === "v2"
        ? "v2"
        : row.questionnaire_version === "v0.7"
          ? "v0.7"
          : "legacy",
    mealStructure: normalizeMealStructure(row.meal_structure),
    components: componentsFromTags(tags),
    finding: {
      fact: row.immediate_constat ?? "Observation ajoutée.",
      reading: row.immediate_reading ?? "",
      nextAction: row.immediate_next_action ?? "",
      frictionPoint: row.main_signal ?? "observation",
      evidenceLevel: "observation unique",
    },
    createdAt: canonicalizeTimestamp(row.created_at),
  };
}

export function buildMealObservationUpsert(
  userId: string,
  meal: MealEntry,
  updatedAt = new Date().toISOString(),
): MealInsert {
  return {
    user_id: userId,
    observed_at: observedAt(meal.date, meal.time),
    observed_date: meal.date,
    observed_time: meal.time,
    meal_type: meal.kind,
    raw_text: meal.freeText,
    quantity_served: meal.quantity,
    serving_pattern: meal.servingPattern,
    hunger_before: meal.hungerBefore,
    fullness_after: meal.fullnessAfter,
    stop_reason: meal.stopReason,
    post_meal_snacking: meal.snackingAfter,
    starter_taken: meal.starterTaken,
    starter_text: meal.starterText,
    dessert_taken: meal.dessertTaken,
    dessert_text: meal.dessertText,
    snack_trigger: meal.snackTrigger,
    snack_context: meal.snackContext,
    clarifications: meal.clarifications as unknown as Json,
    meal_structure: (meal.mealStructure ?? null) as unknown as Json,
    questionnaire_version: meal.questionnaireVersion,
    main_signal: meal.finding.frictionPoint,
    immediate_constat: meal.finding.fact,
    immediate_reading: meal.finding.reading,
    immediate_next_action: meal.finding.nextAction,
    created_at: canonicalizeTimestamp(meal.createdAt),
    updated_at: updatedAt,
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

export async function upsertMealObservation(
  supabase: AppSupabaseClient,
  userId: string,
  meal: MealEntry,
  signal?: AbortSignal,
): Promise<void> {
  const mealQuery = supabase
    .from("meal_observations")
    .upsert(
      buildMealObservationUpsert(userId, meal),
      { onConflict: "user_id,created_at" },
    )
    .select("id");
  const { data, error } = signal
    ? await mealQuery.abortSignal(signal).single()
    : await mealQuery.single();

  throwIfSupabaseError(error);

  if (!data) {
    return;
  }

  const deleteTagsQuery = supabase
    .from("meal_observation_tags")
    .delete()
    .eq("user_id", userId)
    .eq("observation_id", data.id);
  const { error: deleteError } = signal
    ? await deleteTagsQuery.abortSignal(signal)
    : await deleteTagsQuery;

  throwIfSupabaseError(deleteError);

  const tags = tagsFromComponents(meal.components);

  if (tags.length === 0) {
    return;
  }

  const insertTagsQuery = supabase
    .from("meal_observation_tags")
    .insert(
      tags.map((tag) => ({
        observation_id: data.id,
        user_id: userId,
        tag,
      })),
    );
  const { error: insertError } = signal
    ? await insertTagsQuery.abortSignal(signal)
    : await insertTagsQuery;

  throwIfSupabaseError(insertError);
}

export async function upsertMealObservations(
  supabase: AppSupabaseClient,
  userId: string,
  meals: MealEntry[],
): Promise<void> {
  for (const meal of meals) {
    await upsertMealObservation(supabase, userId, meal);
  }
}

export async function deleteMealObservation(
  supabase: AppSupabaseClient,
  userId: string,
  createdAt: string,
  signal?: AbortSignal,
): Promise<void> {
  const canonicalCreatedAt = canonicalizeTimestamp(createdAt);
  const query = supabase
    .from("meal_observations")
    .delete()
    .eq("user_id", userId)
    .eq("created_at", canonicalCreatedAt);
  const { error } = signal ? await query.abortSignal(signal) : await query;

  throwIfSupabaseError(error);
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
