export type ISODate = string;

export type FrictionChoice =
  | "large-portions"
  | "snacking-without-hunger"
  | "habit-meals"
  | "low-activity"
  | "irregularity"
  | "unknown";

export type SmokingStatus =
  | "non-renseigne"
  | "non"
  | "occasionnellement"
  | "tous-les-jours"
  | "arrete";

export type SmokingGoal = "arreter" | "reduire" | "observer" | "pas-maintenant";

export type BehaviorFrequency = 0 | 1 | 2 | 3 | null;

export type BehavioralAxis =
  | "rhythm_hunger"
  | "satiety_control"
  | "emotional"
  | "external_cues"
  | "habit_context"
  | "restriction_rebound";

export type BehaviorContext =
  | "evening-night"
  | "screen"
  | "work"
  | "car-travel"
  | "hotel"
  | "restaurant-social"
  | "alone-home"
  | "no-specific-context"
  | "unknown";

export type PerceivedFriction =
  | "large-portions"
  | "snacking-without-hunger"
  | "habit-meals"
  | "irregularity"
  | "emotional"
  | "stopping"
  | "unknown";

export type ProfessionalSupportStatus =
  | "yes"
  | "no"
  | "prefer-not-to-say";

export interface InitialBehaviorAnswers {
  rhythm: BehaviorFrequency;
  hunger: BehaviorFrequency;
  satietyControl: BehaviorFrequency;
  emotional: BehaviorFrequency;
  externalCues: BehaviorFrequency;
  habitContext: BehaviorFrequency;
  restrictionRebound: BehaviorFrequency;
}

export interface BehaviorHypothesis {
  axis: BehavioralAxis;
  level: 2 | 3;
}

export interface InitialBehaviorAssessment {
  version: 1;
  completedAt: string;
  answers: InitialBehaviorAnswers;
  contexts: BehaviorContext[];
  perceivedFrictions: PerceivedFriction[];
  professionalSupport?: ProfessionalSupportStatus;
  hypotheses: BehaviorHypothesis[];
  evidence: "self-reported";
}

export interface Profile {
  firstName: string;
  age: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  startDate: ISODate;
  initialFriction: FrictionChoice;
  initialBehaviorAssessment?: InitialBehaviorAssessment;
  smokingStatus: SmokingStatus;
  smokingGoal?: SmokingGoal;
  showActiveMission: boolean;
  darkMode: boolean;
  weeklyActivityGoal: number;
  createdAt: string;
}

export interface MealComponents {
  proteins: boolean;
  vegetables: boolean;
  starches: boolean;
  fried: boolean;
  dessert: boolean;
  richSauce: boolean;
  ultraProcessed: boolean;
  sugaryDrink: boolean;
  zeroDrink: boolean;
  alcohol: boolean;
}

export type MealKind =
  | "petit-dejeuner"
  | "dejeuner"
  | "diner"
  | "grignotage"
  | "collation"
  | "autre";
export type ActiveMealKind = Exclude<MealKind, "collation" | "autre">;
export type ServedQuantity =
  | "reasonable-plate"
  | "loaded-plate"
  | "two-plates"
  | "three-plus-plates";
export type HungerBefore =
  | "pas-faim"
  | "petite-faim"
  | "vraie-faim"
  | "tres-faim"
  | "yes"
  | "not_really"
  | "no"
  | "unsure";
export type MealAfter =
  | "encore-faim"
  | "satisfait"
  | "trop-plein"
  | "inconfortable"
  | "still_hungry"
  | "fine"
  | "too_full"
  | "uncomfortable";
export type StopReason =
  | "rassasie"
  | "assiette-vide"
  | "arret-volontaire"
  | "contrainte-exterieure";
export type SnackingAfter = "non" | "oui-leger" | "oui-important";
export type ServingPattern = "none" | "once" | "multiple" | "buffet";
export type FullnessAfter =
  | "still_hungry"
  | "fine"
  | "too_full"
  | "uncomfortable";
export type SnackTrigger =
  | "hunger"
  | "boredom"
  | "stress"
  | "habit"
  | "craving"
  | "unsure";
export type SnackContext = "hotel" | "car" | "home" | "work" | "other";
export type QuestionnaireVersion = "legacy" | "v0.7" | "v2";

export type MealQuantityUnit =
  | "piece"
  | "portion"
  | "plate"
  | "bowl"
  | "glass"
  | "slice"
  | "spoon"
  | "handful"
  | "other"
  | "unknown";

export type MealQuantityConfidence =
  | "not_estimated"
  | "low"
  | "medium"
  | "high";

export interface MealQuantityEstimate {
  amount: number | null;
  unit: MealQuantityUnit;
  text: string | null;
  confidence: MealQuantityConfidence;
}

export type MealSectionKind = "starter" | "main" | "dessert" | "snack";
export type MealPassageRelation =
  | "same"
  | "partial"
  | "side_only"
  | "smaller"
  | "other";
export type MealItemRecognitionStatus =
  | "unprocessed"
  | "recognized"
  | "confirmed"
  | "ambiguous"
  | "unrecognized"
  | "from_recipe_snapshot";

export interface MealItemV2 {
  id: string;
  rawText: string;
  recognitionStatus: MealItemRecognitionStatus;
  canonicalName: string | null;
  ciqualCode: string | null;
  confidence: number | null;
  quantity: MealQuantityEstimate | null;
}

export interface MealPassageV2 {
  id: string;
  index: number;
  relationToPrevious: MealPassageRelation | null;
  relationText: string | null;
  items: MealItemV2[];
}

export interface MealSectionV2 {
  id: string;
  kind: MealSectionKind;
  rawText: string;
  quantity: MealQuantityEstimate | null;
  passages: MealPassageV2[];
}

export type HungerAtReservice = "yes" | "not_really" | "no" | "unsure";
export type ReserviceReason =
  | "pleasure"
  | "habit"
  | "stress_emotion"
  | "food_available"
  | "avoid_waste"
  | "others"
  | "unsure";

export interface MealBehaviorV2 {
  hungerBefore: HungerBefore;
  fullnessAfter: FullnessAfter;
  hungerAtReservice: HungerAtReservice | null;
  reserviceReasons: ReserviceReason[];
}

export interface MealStructureV2 {
  version: 2;
  source: "meal_tunnel_v2" | "legacy_adapter";
  sections: MealSectionV2[];
  behavior: MealBehaviorV2;
}

export interface MealClarification {
  key: string;
  question: string;
  value: string | null;
  customText?: string | null;
}

export interface ImmediateFinding {
  fact: string;
  reading: string;
  nextAction: string;
  frictionPoint: string;
  evidenceLevel: "observation unique";
}

export interface MealEntry {
  id: string;
  date: ISODate;
  time: string;
  kind: MealKind;
  freeText: string;
  quantity: ServedQuantity;
  servingPattern: ServingPattern;
  hungerBefore: HungerBefore;
  afterMeal: MealAfter;
  fullnessAfter: FullnessAfter;
  stopReason: StopReason;
  snackingAfter: SnackingAfter;
  starterTaken: boolean;
  starterText: string | null;
  dessertTaken: boolean;
  dessertText: string | null;
  snackTrigger: SnackTrigger | null;
  snackContext: SnackContext | null;
  clarifications: MealClarification[];
  questionnaireVersion: QuestionnaireVersion;
  mealStructure?: MealStructureV2 | null;
  components: MealComponents;
  finding: ImmediateFinding;
  createdAt: string;
}

export type MealMutation =
  | {
      id: string;
      ownerUserId: string;
      entity: "meal";
      action: "upsert";
      entityKey: string;
      createdAt: string;
      payload: MealEntry;
      queuedAt: string;
    }
  | {
      id: string;
      ownerUserId: string;
      entity: "meal";
      action: "delete";
      entityKey: string;
      createdAt: string;
      queuedAt: string;
    };

export type MealMutationPayload =
  | Pick<
      Extract<MealMutation, { action: "upsert" }>,
      "entity" | "action" | "entityKey" | "createdAt" | "payload"
    >
  | Pick<
      Extract<MealMutation, { action: "delete" }>,
      "entity" | "action" | "entityKey" | "createdAt"
    >;

export interface WeightEntry {
  id: string;
  date: ISODate;
  time: string;
  weightKg: number;
  createdAt: string;
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface WorkoutExercise {
  id: string;
  name: string;
  prescription: string;
}

export interface WorkoutDay {
  title: string;
  kind: "strength" | "walk" | "mobility";
  description: string;
  exercises?: WorkoutExercise[];
}

export interface ActivityEntry {
  id: string;
  date: ISODate;
  time: string;
  title: string;
  completedExerciseIds: string[];
  sessionCompleted: boolean;
  createdAt: string;
}

export type SmokingDayState = "aucun" | "envie" | "cigarette";

export interface SmokingEntry {
  id: string;
  date: ISODate;
  time: string;
  state: SmokingDayState;
  note?: string;
  createdAt: string;
}

export type ProfilePatch = Partial<
  Omit<Profile, "smokingGoal"> & { smokingGoal: SmokingGoal | null }
>;

export type NonMealMutation =
  | {
      id: string;
      ownerUserId: string;
      epoch: number;
      entity: "profile";
      action: "create" | "patch";
      entityKey: "profile";
      patch: ProfilePatch;
      queuedAt: string;
    }
  | {
      id: string;
      ownerUserId: string;
      epoch: number;
      entity: "weight";
      action: "upsert";
      entityKey: string;
      payload: WeightEntry;
      queuedAt: string;
    }
  | {
      id: string;
      ownerUserId: string;
      epoch: number;
      entity: "smoking";
      action: "upsert";
      entityKey: string;
      payload: SmokingEntry;
      queuedAt: string;
    };

export type NonMealMutationDraft =
  | Pick<
      Extract<NonMealMutation, { entity: "profile" }>,
      "entity" | "action" | "entityKey" | "patch"
    >
  | Pick<
      Extract<NonMealMutation, { entity: "weight" }>,
      "entity" | "action" | "entityKey" | "payload"
    >
  | Pick<
      Extract<NonMealMutation, { entity: "smoking" }>,
      "entity" | "action" | "entityKey" | "payload"
    >;

export type StoredCloudMutation =
  | {
      id: string;
      ownerUserId: string;
      generationId: string;
      kind: "non-meal";
      queuedAt: string;
      payload: NonMealMutationDraft;
    }
  | {
      id: string;
      ownerUserId: string;
      generationId: string;
      kind: "meal";
      queuedAt: string;
      payload: MealMutationPayload;
    };

export type CloudOperation =
  | {
      kind: "non-meal";
      ownerUserId: string;
      payload: NonMealMutationDraft;
    }
  | {
      kind: "meal";
      ownerUserId: string;
      payload: MealMutationPayload;
    };

export type PreparedCloudOperation = {
  operation: CloudOperation;
  sourceMutationIds: string[];
};

export type QuarantinedCloudRecord = {
  id: string;
  ownerUserId: string;
  generationId: string | null;
  category: "invalid-mutation" | "legacy-snapshot";
  reason: string;
  payload: unknown;
  quarantinedAt: string;
};

export type PriorityId =
  | "quantity"
  | "real-hunger"
  | "initial-portion"
  | "context"
  | "maintenance"
  | "insufficient-data";

export type EvidenceLevel =
  | "données insuffisantes"
  | "signal faible"
  | "tendance"
  | "tendance confirmée";

export interface Priority {
  id: PriorityId;
  label: string;
  evidenceLevel: EvidenceLevel;
  rationale: string;
  action: string;
  domain: "alimentation" | "observation";
}

export interface WeeklyAnalysis {
  weekStart: ISODate;
  weekEnd: ISODate;
  mealCount: number;
  onePlateMeals: number;
  multiPlateMeals: number;
  mealsStartedWithoutHunger: number;
  mealsEndedTooFull: number;
  snackingWithoutHunger: number;
  activitiesCompleted: number;
  activityGoal: number;
  weightAverageKg: number | null;
  smokingEntries: number;
  smokeFreeDays: number;
  facts: string[];
  frictionPoint: string;
  priority: Priority;
}

export interface AppData {
  profile: Profile | null;
  weights: WeightEntry[];
  meals: MealEntry[];
  activities: ActivityEntry[];
  smokingEntries: SmokingEntry[];
}

export type AppDataWithoutMeals = Omit<AppData, "meals"> & {
  meals?: never;
};
