export type ISODateTime = string;

export type SportActivity = "strength" | "walk_run" | "swim";

export type SportGoal =
  | "restart_activity"
  | "support_weight_loss"
  | "improve_endurance"
  | "build_strength"
  | "general_conditioning";

export type SportFrequency =
  | "once_weekly"
  | "twice_weekly"
  | "three_weekly"
  | "four_plus_weekly"
  | "undefined";

export type SportLocation = "home" | "outdoor" | "gym" | "pool";

export type EquipmentType =
  | "none"
  | "mat"
  | "stable_chair"
  | "resistance_band"
  | "dumbbells"
  | "pull_up_bar"
  | "gym_equipment"
  | "kickboard"
  | "pull_buoy"
  | "fins";

export type LimitationKind =
  | "pain"
  | "injury"
  | "discomfort"
  | "movement_limitation"
  | "none";

export type BodyZone =
  | "shoulders"
  | "back"
  | "knees"
  | "hips"
  | "wrists"
  | "ankles"
  | "other";

export type CapabilityDimension =
  | "upper_push"
  | "upper_pull"
  | "legs"
  | "posterior_chain"
  | "core"
  | "cardio_endurance"
  | "swimming"
  | "mobility";

export type CapabilityLevel = 0 | 1 | 2 | 3 | 4;

export type CapabilitySource =
  | "initial_declaration"
  | "calibration"
  | "workout_feedback"
  | "manual_adjustment";

export type ExerciseValidationStatus =
  | "draft_unreviewed"
  | "review_pending"
  | "validated";

export type MovementPattern =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "bridge"
  | "core"
  | "mobility"
  | "locomotion";

export type WorkoutStepType =
  | "presentation"
  | "preparation"
  | "warmup"
  | "effort"
  | "recovery"
  | "transition"
  | "cooldown"
  | "distance"
  | "pool_length";

export type WorkoutStatus =
  | "proposed"
  | "started"
  | "paused"
  | "completed"
  | "partially_completed"
  | "abandoned";

export type FeedbackDifficulty = "too_easy" | "right" | "too_hard";

export type FeedbackCompletion = "completed" | "partial" | "stopped";

export type FeedbackBodySignal = "none" | "mild_discomfort" | "unusual_pain";

export type ProgressionVariable =
  | "none"
  | "effort_duration"
  | "recovery_duration"
  | "variant_difficulty"
  | "round_count";

export type ReasonSeverity = "info" | "caution";

export interface SportProfile {
  id: string;
  userId: string;
  goals: SportGoal[];
  preferredActivities: SportActivity[];
  desiredFrequency: SportFrequency;
  usualDurationMinutes: number;
  availableLocations: SportLocation[];
  questionnaireCompleted: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  walkRunReadiness?: WalkRunReadiness;
  swimReadiness?: SwimReadiness;
}

export interface WalkRunReadiness {
  comfortableWalkMinutes: number | null;
  canRunShortBursts: boolean;
  runsRegularly: boolean;
  prefersWalkOnly: boolean;
}

export interface SwimReadiness {
  hasPoolAccess: boolean;
  poolLengthMeters: 25 | 50 | number | null;
  knownStrokes: string[];
  continuousDistanceMeters: number | null;
  waterConfidence: "low" | "medium" | "high" | null;
  supervisedOnly: boolean;
}

export interface UserEquipment {
  id: string;
  userId: string;
  type: EquipmentType;
  available: boolean;
  details?: string | null;
  updatedAt: ISODateTime;
}

export interface UserLimitation {
  id: string;
  userId: string;
  kind: LimitationKind;
  zone: BodyZone | null;
  description?: string | null;
  active: boolean;
  declaredAt: ISODateTime;
  resolvedAt?: ISODateTime | null;
}

export interface UserCapability {
  id: string;
  userId: string;
  dimension: CapabilityDimension;
  level: CapabilityLevel;
  source: CapabilitySource;
  updatedAt: ISODateTime;
}

export interface ExerciseMedia {
  id: string;
  exerciseId: string;
  variantId?: string | null;
  kind: "illustration" | "animation" | "short_video";
  placeholder: boolean;
  altText: string;
  source: string;
  license: string;
  validationStatus: ExerciseValidationStatus;
}

export interface ExerciseVariant {
  id: string;
  exerciseId: string;
  name: string;
  difficulty: CapabilityLevel;
  requiredEquipment: EquipmentType[];
  easierVariantId?: string | null;
  harderVariantId?: string | null;
  guidance: string;
  primaryCue: string;
  effortSecondsMin: number;
  effortSecondsMax: number;
}

export interface Exercise {
  id: string;
  name: string;
  activity: Extract<SportActivity, "strength">;
  movementPattern: MovementPattern;
  capabilityDimension: CapabilityDimension;
  shortDescription: string;
  primaryCue: string;
  teachingSteps: string[];
  commonMistakes: string[];
  breathing: string;
  requiredEquipment: EquipmentType[];
  targetZones: BodyZone[];
  cautionZones: BodyZone[];
  difficulty: CapabilityLevel;
  effortSecondsMin: number;
  effortSecondsMax: number;
  active: boolean;
  validationStatus: ExerciseValidationStatus;
  variants: ExerciseVariant[];
  media: ExerciseMedia[];
}

export interface SportEngineReason {
  code:
    | "activity_supported"
    | "activity_not_implemented"
    | "duration_respected"
    | "equipment_match"
    | "equipment_excluded"
    | "limitation_excluded"
    | "capability_variant"
    | "missing_capability_prudent_default"
    | "time_distribution"
    | "adaptation_applied"
    | "adaptation_deferred"
    | "no_compatible_exercise"
    | "pull_skipped_without_equipment";
  message: string;
  severity: ReasonSeverity;
  exerciseId?: string;
  variantId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface WorkoutStep {
  id: string;
  sessionId: string;
  order: number;
  type: WorkoutStepType;
  exerciseId?: string | null;
  variantId?: string | null;
  title: string;
  instruction: string;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  poolLengths?: number | null;
  skippable: boolean;
  nextPreparation?: string | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  activity: SportActivity;
  requestedDurationMinutes: number;
  plannedDurationSeconds: number;
  performedDurationSeconds: number | null;
  status: WorkoutStatus;
  scheduledAt: ISODateTime;
  generationEngineVersion: string;
  plannedDifficulty: CapabilityLevel;
  generalReason: string;
  reasons: SportEngineReason[];
  generationInputSnapshot: SportGenerationSnapshot;
}

export interface GeneratedWorkoutSession extends WorkoutSession {
  steps: WorkoutStep[];
}

export interface WorkoutFeedback {
  id: string;
  userId: string;
  sessionId: string;
  difficulty: FeedbackDifficulty;
  completion: FeedbackCompletion;
  bodySignal: FeedbackBodySignal;
  affectedZone?: BodyZone | null;
  comment?: string | null;
  createdAt: ISODateTime;
}

export interface SportGenerationSnapshot {
  activity: SportActivity;
  requestedDurationMinutes: number;
  location: SportLocation;
  equipment: EquipmentType[];
  activeLimitations: Array<Pick<UserLimitation, "kind" | "zone">>;
  capabilities: Partial<Record<CapabilityDimension, CapabilityLevel>>;
  appliedAdjustment: ProgressionAdjustment;
}

export interface SportGenerationInput {
  userId: string;
  activity: SportActivity;
  requestedDurationMinutes: number;
  location: SportLocation;
  equipment: UserEquipment[];
  limitations: UserLimitation[];
  capabilities: UserCapability[];
  previousSessions: GeneratedWorkoutSession[];
  feedback: WorkoutFeedback[];
  now: ISODateTime;
  seed?: string;
}

export interface ProgressionAdjustment {
  variable: ProgressionVariable;
  direction: "increase" | "decrease" | "maintain";
  reason: string;
  value: number;
  dimension?: CapabilityDimension;
  exerciseId?: string;
}

export interface SportLocalData {
  profile: SportProfile | null;
  equipment: UserEquipment[];
  limitations: UserLimitation[];
  capabilities: UserCapability[];
  sessions: GeneratedWorkoutSession[];
  feedback: WorkoutFeedback[];
}

export interface OwnedSportResource {
  userId: string;
}

export interface SportOnboardingDraft {
  goals: SportGoal[];
  preferredActivities: SportActivity[];
  usualDurationMinutes: number | null;
  desiredFrequency: SportFrequency | null;
  availableLocations: SportLocation[];
  equipment: EquipmentType[];
  limitationKind: LimitationKind;
  limitationZone: BodyZone | null;
  limitationDescription: string;
  pushCapability: CapabilityLevel;
  pullCapability: CapabilityLevel | null;
  legsCapability: CapabilityLevel;
  coreCapability: CapabilityLevel;
}

export type AssessmentFeeling =
  | "too_easy"
  | "right"
  | "too_hard"
  | "discomfort";

export interface SportAssessmentResults {
  upperPush: AssessmentFeeling;
  legs: AssessmentFeeling;
  core: AssessmentFeeling;
  cardio: AssessmentFeeling;
}

export interface SportAssessmentLevelResults {
  upperPush: CapabilityLevel;
  legs: CapabilityLevel;
  core: CapabilityLevel;
  cardio: CapabilityLevel;
}

export type TimerStatus =
  | "idle"
  | "preparation"
  | "warmup"
  | "effort"
  | "recovery"
  | "transition"
  | "cooldown"
  | "paused"
  | "finished"
  | "canceled";

export interface TimerStep {
  id: string;
  type: WorkoutStepType;
  title: string;
  instruction: string;
  durationSeconds: number;
}

export interface WorkoutTimerState {
  workoutId: string;
  steps: TimerStep[];
  status: TimerStatus;
  currentStepIndex: number;
  startedAtMs: number | null;
  currentStepStartedAtMs: number | null;
  elapsedBeforeCurrentStepMs: number;
  pausedAtMs: number | null;
  pausedElapsedInStepMs: number;
  totalPausedMs: number;
  finishedAtMs: number | null;
  canceledAtMs: number | null;
}

export interface WorkoutTimerView {
  status: TimerStatus;
  currentStep: TimerStep | null;
  currentStepIndex: number;
  totalSteps: number;
  activeStepElapsedSeconds: number;
  activeStepRemainingSeconds: number;
  totalElapsedSeconds: number;
  totalRemainingSeconds: number;
  nextStep: TimerStep | null;
}
