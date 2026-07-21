import { buildImmediateFinding, EMPTY_COMPONENTS } from "@/lib/analytics";
import {
  detectMealComponents,
  mergeDetectedClarifications,
} from "@/lib/foodDetection";
import {
  activeFoodSegment,
  appendFoodInputText,
  cleanFoodInputText,
  removeActiveFoodSegment,
  type FoodAutocompleteSuggestion,
} from "@/lib/nutrition/autocompleteFood";
import {
  getMealTunnelStepIds,
  type MealTunnelStepId,
} from "@/lib/mealTunnel";
import { todayISO } from "@/lib/dates";
import type {
  ActiveMealKind,
  FullnessAfter,
  HungerAtReservice,
  HungerBefore,
  ISODate,
  MealAfter,
  MealClarification,
  MealComponents,
  MealEntry,
  MealItemV2,
  MealKind,
  MealPassageRelation,
  MealQuantityEstimate,
  MealQuantityUnit,
  MealStructureV2,
  QuestionnaireVersion,
  ReserviceReason,
  ServedQuantity,
  ServingPattern,
  SnackContext,
  SnackTrigger,
  SnackingAfter,
  StopReason,
} from "@/lib/types";

export interface MealQuantityDraft {
  amount: string;
  unit: MealQuantityUnit;
  note: string;
}

export interface MealDraftFoodSelection {
  id: string;
  rawText: string;
  rawTexts: string[];
  canonicalName: string;
  ciqualCode: string | null;
  confidence: number;
  source: string;
  sourceVersion: string | null;
  count: number;
  defaultUnit: MealQuantityUnit;
}

export interface MealDraft {
  kind: ActiveMealKind;
  date: ISODate;
  time: string;
  freeText: string;
  quantity: ServedQuantity;
  servingPattern: ServingPattern;
  mainQuantity: MealQuantityDraft;
  hungerBefore: HungerBefore;
  hungerAtReservice: HungerAtReservice | null;
  afterMeal: MealAfter;
  fullnessAfter: FullnessAfter;
  stopReason: StopReason;
  snackingAfter: SnackingAfter;
  starterTaken: boolean;
  starterText: string;
  starterQuantity: MealQuantityDraft;
  dessertTaken: boolean;
  dessertText: string;
  dessertQuantity: MealQuantityDraft;
  snackQuantity: MealQuantityDraft;
  snackTrigger: SnackTrigger | null;
  snackContext: SnackContext | null;
  reserviceRelation: MealPassageRelation | null;
  reserviceText: string;
  reserviceReasons: ReserviceReason[];
  clarifications: MealClarification[];
  selectedFoods: MealDraftFoodSelection[];
  questionnaireVersion: QuestionnaireVersion;
  components: MealComponents;
}

export const servingPatternLabels: Record<ServingPattern, string> = {
  none: "Une portion",
  once: "Une reprise",
  multiple: "Plusieurs reprises",
  buffet: "Buffet / plusieurs passages",
};

export const hungerLabels: Record<HungerBefore, string> = {
  "pas-faim": "Pas faim",
  "petite-faim": "Petite faim",
  "vraie-faim": "Vraie faim",
  "tres-faim": "Très faim",
  yes: "Oui",
  not_really: "Pas vraiment",
  no: "Non",
  unsure: "Je ne sais pas",
};

export const fullnessLabels: Record<FullnessAfter, string> = {
  still_hungry: "Encore faim",
  fine: "Bien",
  too_full: "Trop plein",
  uncomfortable: "Inconfortable",
};

export const quantityUnitLabels: Record<MealQuantityUnit, string> = {
  piece: "pièce",
  portion: "portion",
  plate: "assiette",
  bowl: "bol",
  glass: "verre",
  slice: "part",
  spoon: "cuillère",
  handful: "poignée",
  other: "autre",
  unknown: "je ne sais pas",
};

export const quickQuantityUnits: MealQuantityUnit[] = [
  "portion",
  "plate",
  "bowl",
  "piece",
  "glass",
  "slice",
  "other",
  "unknown",
];

export const reserviceRelationLabels: Record<MealPassageRelation, string> = {
  same: "La même chose",
  partial: "Seulement certains éléments",
  side_only: "Surtout l’accompagnement",
  smaller: "Une plus petite quantité",
  other: "Autre",
};

export const reserviceHungerLabels: Record<HungerAtReservice, string> = {
  yes: "Oui",
  not_really: "Pas vraiment",
  no: "Non",
  unsure: "Je ne sais pas",
};

export const reserviceReasonLabels: Record<ReserviceReason, string> = {
  pleasure: "Plaisir / goût",
  habit: "Habitude",
  stress_emotion: "Stress ou émotion",
  food_available: "Le plat était devant moi",
  avoid_waste: "Ne pas gaspiller",
  others: "Les autres se resservaient",
  unsure: "Je ne sais pas",
};

export const snackTriggerLabels: Record<SnackTrigger, string> = {
  hunger: "Faim",
  boredom: "Ennui",
  stress: "Stress",
  habit: "Habitude",
  craving: "Envie",
  unsure: "Je ne sais pas",
};

export const snackContextLabels: Record<SnackContext, string> = {
  hotel: "Hôtel",
  car: "Voiture",
  home: "Maison",
  work: "Travail",
  other: "Autre",
};

export function emptyQuantityDraft(
  unit: MealQuantityUnit = "portion",
): MealQuantityDraft {
  return {
    amount: "1",
    unit,
    note: "",
  };
}

export function createEmptyMealDraft(
  date: ISODate = todayISO(),
  time = currentMealTime(),
): MealDraft {
  return {
    kind: "dejeuner",
    date,
    time,
    freeText: "",
    quantity: "reasonable-plate",
    servingPattern: "none",
    mainQuantity: emptyQuantityDraft("plate"),
    hungerBefore: "yes",
    hungerAtReservice: null,
    afterMeal: "fine",
    fullnessAfter: "fine",
    stopReason: "rassasie",
    snackingAfter: "non",
    starterTaken: false,
    starterText: "",
    starterQuantity: emptyQuantityDraft("portion"),
    dessertTaken: false,
    dessertText: "",
    dessertQuantity: emptyQuantityDraft("portion"),
    snackQuantity: emptyQuantityDraft("portion"),
    snackTrigger: null,
    snackContext: null,
    reserviceRelation: null,
    reserviceText: "",
    reserviceReasons: [],
    clarifications: [],
    selectedFoods: [],
    questionnaireVersion: "v2",
    components: { ...EMPTY_COMPONENTS },
  };
}

export function quantityEstimateFromDraft(
  draft: MealQuantityDraft,
): MealQuantityEstimate {
  const amount = parseQuantityAmount(draft.amount);
  const note = draft.note.trim() || null;
  const hasUsableUnit = draft.unit !== "unknown";

  return {
    amount,
    unit: draft.unit,
    text: note,
    confidence:
      amount && hasUsableUnit
        ? "medium"
        : hasUsableUnit || note
          ? "low"
          : "not_estimated",
  };
}

export function quantityDraftFromEstimate(
  estimate: MealQuantityEstimate | null | undefined,
  fallbackUnit: MealQuantityUnit,
): MealQuantityDraft {
  return {
    amount: estimate?.amount ? String(estimate.amount) : "1",
    unit: estimate?.unit ?? fallbackUnit,
    note: estimate?.text ?? "",
  };
}

export function quantitySummary(
  quantity: MealQuantityEstimate | null | undefined,
): string | null {
  if (!quantity) return null;
  if (quantity.text) return quantity.text;

  if (quantity.amount && quantity.unit !== "unknown") {
    return `${quantity.amount.toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    })} ${quantityUnitLabels[quantity.unit]}`;
  }

  return quantity.unit === "unknown" ? null : quantityUnitLabels[quantity.unit];
}

export function mealSectionQuantity(
  meal: MealEntry,
  kind: "starter" | "main" | "dessert" | "snack",
): MealQuantityEstimate | null {
  return meal.mealStructure?.sections.find((section) => section.kind === kind)
    ?.quantity ?? null;
}

export function activeKindFromMealKind(kind: MealKind): ActiveMealKind {
  if (kind === "petit-dejeuner" || kind === "dejeuner" || kind === "diner") {
    return kind;
  }
  if (kind === "grignotage" || kind === "collation") return "grignotage";
  return "dejeuner";
}

export function quantityFromServingPattern(
  value: ServingPattern,
): ServedQuantity {
  if (value === "once") return "two-plates";
  if (value === "multiple" || value === "buffet") return "three-plus-plates";
  return "reasonable-plate";
}

export function servingPatternFromQuantity(
  value: ServedQuantity,
): ServingPattern {
  if (value === "two-plates") return "once";
  if (value === "three-plus-plates") return "multiple";
  return "none";
}

export function fullnessFromAfterMeal(value: MealAfter): FullnessAfter {
  if (
    value === "still_hungry" ||
    value === "fine" ||
    value === "too_full" ||
    value === "uncomfortable"
  ) {
    return value;
  }
  if (value === "encore-faim") return "still_hungry";
  if (value === "trop-plein") return "too_full";
  if (value === "inconfortable") return "uncomfortable";
  return "fine";
}

export function hungerForTunnel(value: HungerBefore): HungerBefore {
  if (value === "pas-faim") return "no";
  if (value === "petite-faim") return "not_really";
  if (value === "vraie-faim" || value === "tres-faim") return "yes";
  return value;
}

export function prepareDetectedMealDraft(draft: MealDraft): MealDraft {
  const text = [
    draft.freeText,
    draft.starterTaken ? draft.starterText : "",
    draft.dessertTaken ? draft.dessertText : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...draft,
    components: detectMealComponents(text),
    clarifications: mergeDetectedClarifications(text, draft.clarifications),
  };
}

export function sanitizeMealDraftForKind(draft: MealDraft): MealDraft {
  if (draft.kind === "dejeuner" || draft.kind === "diner") return draft;

  return {
    ...draft,
    starterTaken: false,
    starterText: "",
    starterQuantity: emptyQuantityDraft("portion"),
    dessertTaken: false,
    dessertText: "",
    dessertQuantity: emptyQuantityDraft("portion"),
    servingPattern: "none",
    hungerAtReservice: null,
    reserviceRelation: null,
    reserviceText: "",
    reserviceReasons: [],
  };
}

export function hasReservice(servingPattern: ServingPattern): boolean {
  return (
    servingPattern === "once" ||
    servingPattern === "multiple" ||
    servingPattern === "buffet"
  );
}

export function shouldAskReserviceReason(draft: MealDraft): boolean {
  return (
    hasReservice(draft.servingPattern) &&
    (draft.hungerAtReservice === "not_really" ||
      draft.hungerAtReservice === "no")
  );
}

export function toggleReserviceReason(
  currentReasons: ReserviceReason[],
  reason: ReserviceReason,
): ReserviceReason[] {
  if (currentReasons.includes(reason)) {
    return currentReasons.filter((item) => item !== reason);
  }

  if (reason === "unsure") {
    return ["unsure"];
  }

  return [...currentReasons.filter((item) => item !== "unsure"), reason];
}

export function addMealFoodSelection(
  draft: MealDraft,
  suggestion: FoodAutocompleteSuggestion,
): MealDraft {
  const rawSegment =
    activeFoodSegment(draft.freeText).raw ||
    suggestion.matchedText ||
    suggestion.label;
  const nextFreeText = removeActiveFoodSegment(draft.freeText);
  const existingSelection = draft.selectedFoods.find(
    (item) => item.id === suggestion.id,
  );

  if (existingSelection) {
    return {
      ...draft,
      freeText: nextFreeText,
      selectedFoods: draft.selectedFoods.map((item) => {
        if (item.id !== suggestion.id) return item;
        const rawTexts = [...item.rawTexts, rawSegment];

        return {
          ...item,
          rawText: joinedSelectionRawText(rawTexts),
          rawTexts,
          count: item.count + 1,
        };
      }),
    };
  }

  return {
    ...draft,
    freeText: nextFreeText,
    selectedFoods: [
      ...draft.selectedFoods,
      {
        id: suggestion.id,
        rawText: rawSegment || suggestion.matchedText || suggestion.label,
        rawTexts: [rawSegment || suggestion.matchedText || suggestion.label],
        canonicalName: suggestion.label,
        ciqualCode: suggestion.ciqualCode,
        confidence: suggestion.confidence,
        source: suggestion.source,
        sourceVersion: suggestion.sourceVersion,
        count: 1,
        defaultUnit: suggestion.defaultUnit,
      },
    ],
  };
}

export function removeMealFoodSelection(
  draft: MealDraft,
  foodId: string,
): MealDraft {
  const selection = draft.selectedFoods.find((item) => item.id === foodId);
  if (!selection) return draft;

  const restoredRawText = selection.rawTexts.at(-1) ?? selection.rawText;
  const freeText = appendFoodInputText(draft.freeText, restoredRawText);
  const remainingRawTexts = selection.rawTexts.slice(0, -1);

  if (selection.count > 1) {
    return {
      ...draft,
      freeText,
      selectedFoods: draft.selectedFoods.map((item) =>
        item.id === foodId
          ? {
              ...item,
              rawText: joinedSelectionRawText(remainingRawTexts),
              rawTexts: remainingRawTexts,
              count: item.count - 1,
            }
          : item,
      ),
    };
  }

  return {
    ...draft,
    freeText,
    selectedFoods: draft.selectedFoods.filter((item) => item.id !== foodId),
  };
}

export function shouldSkipMealStep(
  stepId: MealTunnelStepId,
  draft: MealDraft,
): boolean {
  if (stepId === "clarifications") return draft.clarifications.length === 0;
  if (stepId === "reservice-detail" || stepId === "reservice-hunger") {
    return !hasReservice(draft.servingPattern);
  }
  if (stepId === "reservice-reason") return !shouldAskReserviceReason(draft);
  return false;
}

export function getMealStepError(
  stepId: MealTunnelStepId,
  draft: MealDraft,
): string | null {
  if (stepId === "time") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      return "Choisis une date valide.";
    }
    if (!/^\d{2}:\d{2}$/.test(draft.time)) {
      return "Choisis une heure valide.";
    }
  }

  if (
    (stepId === "text" || stepId === "snack-text") &&
    !hasMealContent(draft)
  ) {
    return "Ajoute une observation courte avant de continuer.";
  }
  if (
    stepId === "starter" &&
    draft.starterTaken &&
    draft.starterText.trim().length < 2
  ) {
    return "Note rapidement l’entrée, ou choisis Non.";
  }
  if (
    stepId === "dessert" &&
    draft.dessertTaken &&
    draft.dessertText.trim().length < 2
  ) {
    return "Note rapidement le dessert, ou choisis Non.";
  }
  if (
    stepId === "reservice-detail" &&
    hasReservice(draft.servingPattern) &&
    !draft.reserviceRelation
  ) {
    return "Précise rapidement ce que contenait la reprise.";
  }
  if (
    stepId === "reservice-reason" &&
    shouldAskReserviceReason(draft) &&
    draft.reserviceReasons.length === 0
  ) {
    return "Choisis une raison, ou Je ne sais pas.";
  }

  return null;
}

export function advanceMealTunnel(
  draft: MealDraft,
  step: number,
): { draft: MealDraft; error: string | null; step: number } {
  const stepIds = getMealTunnelStepIds(draft.kind);
  const currentStepId = stepIds[step] ?? stepIds[0];
  const error = getMealStepError(currentStepId, draft);
  if (error) return { draft, error, step };

  let nextDraft =
    currentStepId === "text" ||
    currentStepId === "snack-text" ||
    currentStepId === "starter" ||
    currentStepId === "dessert"
      ? prepareDetectedMealDraft(draft)
      : draft;
  let nextStep = Math.min(stepIds.length - 1, step + 1);

  while (
    nextStep < stepIds.length - 1 &&
    shouldSkipMealStep(stepIds[nextStep], nextDraft)
  ) {
    nextStep += 1;
  }

  if (stepIds[nextStep] === "finding") {
    nextDraft = prepareDetectedMealDraft(nextDraft);
  }

  return { draft: nextDraft, error: null, step: nextStep };
}

export function previousMealTunnelStep(draft: MealDraft, step: number): number {
  const stepIds = getMealTunnelStepIds(draft.kind);
  let previousStep = Math.max(0, step - 1);

  while (
    previousStep > 0 &&
    shouldSkipMealStep(stepIds[previousStep], draft)
  ) {
    previousStep -= 1;
  }

  return previousStep;
}

export function mealDraftFromEntry(meal: MealEntry): MealDraft {
  const mainSection = meal.mealStructure?.sections.find(
    (section) => section.kind === "main" || section.kind === "snack",
  );
  const starterSection = meal.mealStructure?.sections.find(
    (section) => section.kind === "starter",
  );
  const dessertSection = meal.mealStructure?.sections.find(
    (section) => section.kind === "dessert",
  );
  const reservicePassage = mainSection?.passages.find(
    (passage) => passage.index > 1,
  );

  return {
    kind: activeKindFromMealKind(meal.kind),
    date: meal.date,
    time: meal.time,
    freeText: meal.freeText,
    quantity: meal.quantity,
    servingPattern:
      meal.servingPattern ?? servingPatternFromQuantity(meal.quantity),
    mainQuantity: quantityDraftFromEstimate(
      mainSection?.quantity,
      meal.kind === "grignotage" ? "portion" : "plate",
    ),
    hungerBefore: hungerForTunnel(meal.hungerBefore),
    hungerAtReservice: meal.mealStructure?.behavior.hungerAtReservice ?? null,
    afterMeal: meal.afterMeal,
    fullnessAfter: meal.fullnessAfter ?? fullnessFromAfterMeal(meal.afterMeal),
    stopReason: meal.stopReason,
    snackingAfter: "non",
    starterTaken: meal.starterTaken ?? false,
    starterText: meal.starterText ?? "",
    starterQuantity: quantityDraftFromEstimate(
      starterSection?.quantity,
      "portion",
    ),
    dessertTaken: meal.dessertTaken ?? false,
    dessertText: meal.dessertText ?? "",
    dessertQuantity: quantityDraftFromEstimate(
      dessertSection?.quantity,
      "portion",
    ),
    snackQuantity: quantityDraftFromEstimate(mainSection?.quantity, "portion"),
    snackTrigger: meal.snackTrigger ?? null,
    snackContext: meal.snackContext ?? null,
    reserviceRelation: reservicePassage?.relationToPrevious ?? null,
    reserviceText: reservicePassage?.relationText ?? "",
    reserviceReasons: meal.mealStructure?.behavior.reserviceReasons ?? [],
    clarifications: meal.clarifications ?? [],
    selectedFoods: selectedFoodsFromEntry(meal),
    questionnaireVersion: "v2",
    components: { ...meal.components },
  };
}

export function mealEntryFromDraft(
  sourceDraft: MealDraft,
  existingMeal: MealEntry | null,
): MealEntry {
  const draft = prepareDetectedMealDraft(sanitizeMealDraftForKind(sourceDraft));
  const mealText = persistedMealText(draft);
  const quantity = quantityFromServingPattern(draft.servingPattern);
  const finding = buildImmediateFinding({
    kind: draft.kind,
    servingPattern: draft.servingPattern,
    hungerBefore: draft.hungerBefore,
    fullnessAfter: draft.fullnessAfter,
    starterTaken: draft.starterTaken,
    dessertTaken: draft.dessertTaken,
    hungerAtReservice: draft.hungerAtReservice,
    reserviceReasons: draft.reserviceReasons,
    snackTrigger: draft.snackTrigger,
    snackContext: draft.snackContext,
    components: draft.components,
  });

  return {
    id: existingMeal?.id ?? createMealId("meal"),
    date: draft.date,
    time: draft.time,
    kind: draft.kind,
    freeText: mealText,
    quantity,
    servingPattern: draft.servingPattern,
    hungerBefore: draft.hungerBefore,
    afterMeal: draft.fullnessAfter,
    fullnessAfter: draft.fullnessAfter,
    stopReason: draft.stopReason,
    snackingAfter: draft.snackingAfter,
    starterTaken: draft.starterTaken,
    starterText:
      draft.starterTaken && draft.starterText.trim()
        ? draft.starterText.trim()
        : null,
    dessertTaken: draft.dessertTaken,
    dessertText:
      draft.dessertTaken && draft.dessertText.trim()
        ? draft.dessertText.trim()
        : null,
    snackTrigger: draft.kind === "grignotage" ? draft.snackTrigger : null,
    snackContext: draft.kind === "grignotage" ? draft.snackContext : null,
    clarifications: draft.clarifications,
    questionnaireVersion: "v2",
    mealStructure: buildMealStructure(draft),
    components: draft.components,
    finding,
    createdAt: existingMeal?.createdAt ?? new Date().toISOString(),
  };
}

export function getMealSubmitError(draft: MealDraft): string | null {
  if (!hasMealContent(draft)) {
    return "Ajoute une observation courte avant de continuer.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    return "Choisis une date valide.";
  }
  if (!/^\d{2}:\d{2}$/.test(draft.time)) {
    return "Choisis une heure valide.";
  }
  return null;
}

function parseQuantityAmount(value: string): number | null {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function buildMealStructure(draft: MealDraft): MealStructureV2 {
  const sections: MealStructureV2["sections"] = [];
  const mainQuantity = quantityEstimateFromDraft(draft.mainQuantity);
  const mealText = persistedMealText(draft);

  if (draft.starterTaken && draft.starterText.trim()) {
    sections.push(
      createSinglePassageSection({
        kind: "starter",
        rawText: draft.starterText.trim(),
        quantity: quantityEstimateFromDraft(draft.starterQuantity),
      }),
    );
  }

  if (draft.kind === "grignotage") {
    const snackQuantity = quantityEstimateFromDraft(draft.snackQuantity);
    sections.push(
      createSinglePassageSection({
        kind: "snack",
        rawText: mealText,
        quantity: snackQuantity,
        items: mealItemsFromDraft(draft, snackQuantity),
      }),
    );
  } else {
    const mainSection = createSinglePassageSection({
      kind: "main",
      rawText: mealText,
      quantity: mainQuantity,
      items: mealItemsFromDraft(draft, mainQuantity),
    });

    if (hasReservice(draft.servingPattern)) {
      const reserviceText =
        draft.reserviceText.trim() ||
        (draft.reserviceRelation === "same"
          ? mealText
          : reserviceRelationLabels[draft.reserviceRelation ?? "other"]);

      mainSection.passages.push({
        id: createMealId("meal-passage"),
        index: 2,
        relationToPrevious: draft.reserviceRelation ?? "other",
        relationText: draft.reserviceText.trim() || null,
        items: [
          createMealItem(
            reserviceText,
            draft.reserviceRelation === "same" ? mainQuantity : null,
          ),
        ],
      });
    }
    sections.push(mainSection);
  }

  if (draft.dessertTaken && draft.dessertText.trim()) {
    sections.push(
      createSinglePassageSection({
        kind: "dessert",
        rawText: draft.dessertText.trim(),
        quantity: quantityEstimateFromDraft(draft.dessertQuantity),
      }),
    );
  }

  return {
    version: 2,
    source: "meal_tunnel_v2",
    sections,
    behavior: {
      hungerBefore: draft.hungerBefore,
      fullnessAfter: draft.fullnessAfter,
      hungerAtReservice: hasReservice(draft.servingPattern)
        ? draft.hungerAtReservice ?? "unsure"
        : null,
      reserviceReasons: shouldAskReserviceReason(draft)
        ? draft.reserviceReasons
        : [],
    },
  };
}

function createMealItem(
  rawText: string,
  quantity: MealQuantityEstimate | null,
) {
  return {
    id: createMealId("meal-item"),
    rawText,
    recognitionStatus: "unprocessed" as const,
    canonicalName: null,
    ciqualCode: null,
    confidence: null,
    quantity,
  };
}

function createSelectedMealItem(selection: MealDraftFoodSelection): MealItemV2 {
  return {
    id: selection.id,
    rawText: joinedSelectionRawText(selection.rawTexts),
    recognitionStatus: "confirmed",
    canonicalName: selection.canonicalName,
    ciqualCode: selection.ciqualCode,
    confidence: selection.confidence,
    source: selection.source,
    sourceVersion: selection.sourceVersion,
    quantity: {
      amount: selection.count,
      unit: selection.defaultUnit,
      text: null,
      confidence: "medium",
    },
  };
}

function selectedMealItems(
  selections: MealDraftFoodSelection[],
): MealItemV2[] | null {
  return selections.length > 0
    ? selections.map((selection) => createSelectedMealItem(selection))
    : null;
}

function mealItemsFromDraft(
  draft: MealDraft,
  quantity: MealQuantityEstimate | null,
): MealItemV2[] | null {
  const items = selectedMealItems(draft.selectedFoods) ?? [];
  const remainingText = cleanFoodInputText(draft.freeText);

  if (remainingText) {
    items.push(createMealItem(remainingText, items.length === 0 ? quantity : null));
  }

  return items.length > 0 ? items : null;
}

function createSinglePassageSection({
  kind,
  rawText,
  quantity,
  items,
}: {
  kind: "starter" | "main" | "dessert" | "snack";
  rawText: string;
  quantity: MealQuantityEstimate | null;
  items?: MealItemV2[] | null;
}): MealStructureV2["sections"][number] {
  return {
    id: createMealId(`meal-section-${kind}`),
    kind,
    rawText,
    quantity,
    passages: [
      {
        id: createMealId("meal-passage"),
        index: 1,
        relationToPrevious: null,
        relationText: null,
        items: items && items.length > 0 ? items : [createMealItem(rawText, quantity)],
      },
    ],
  };
}

function selectedFoodsFromEntry(meal: MealEntry): MealDraftFoodSelection[] {
  const primarySection = meal.mealStructure?.sections.find(
    (section) => section.kind === "main" || section.kind === "snack",
  );

  return (
    primarySection?.passages
      .find((passage) => passage.index === 1)
      ?.items.filter(
        (item) =>
          item.recognitionStatus === "confirmed" &&
          Boolean(item.canonicalName),
      )
      .map((item) => ({
        id: item.ciqualCode ?? item.id,
        rawText: item.rawText,
        rawTexts: rawTextsFromMealItem(item),
        canonicalName: item.canonicalName ?? item.rawText,
        ciqualCode: item.ciqualCode,
        confidence: item.confidence ?? 1,
        source: item.source ?? (item.ciqualCode ? "ciqual-2025" : "meal_structure"),
        sourceVersion: item.sourceVersion ?? (item.ciqualCode ? "2025" : null),
        count: mealItemCount(item),
        defaultUnit: item.quantity?.unit ?? "portion",
      })) ?? []
  );
}

function hasMealContent(draft: MealDraft): boolean {
  return draft.freeText.trim().length >= 2 || draft.selectedFoods.length > 0;
}

function joinedSelectionRawText(rawTexts: string[]): string {
  return rawTexts.map(cleanFoodInputText).filter(Boolean).join(", ");
}

function persistedMealText(draft: MealDraft): string {
  const remainingText = cleanFoodInputText(draft.freeText);
  const selectedTexts = draft.selectedFoods
    .flatMap((selection) => selection.rawTexts)
    .map(cleanFoodInputText)
    .filter(Boolean);

  return [remainingText, ...selectedTexts].filter(Boolean).join(", ");
}

function mealItemCount(item: MealItemV2): number {
  const amount = item.quantity?.amount;
  return amount && amount > 0 ? amount : 1;
}

function rawTextsFromMealItem(item: MealItemV2): string[] {
  const count = mealItemCount(item);
  const rawTexts = item.rawText
    .split(",")
    .map(cleanFoodInputText)
    .filter(Boolean);

  if (rawTexts.length >= count) return rawTexts.slice(0, count);
  if (rawTexts.length > 0) {
    return [
      ...rawTexts,
      ...Array.from({ length: count - rawTexts.length }, () => rawTexts.at(-1)!),
    ];
  }
  return Array.from({ length: count }, () => item.rawText);
}

function createMealId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentMealTime(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
