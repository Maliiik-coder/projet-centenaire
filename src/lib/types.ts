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

export interface Profile {
  firstName: string;
  age: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  startDate: ISODate;
  initialFriction: FrictionChoice;
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
export type QuestionnaireVersion = "legacy" | "v0.7";

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
  components: MealComponents;
  finding: ImmediateFinding;
  createdAt: string;
}

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
