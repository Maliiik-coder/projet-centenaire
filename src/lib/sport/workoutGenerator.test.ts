import { describe, expect, it } from "vitest";
import { SPORT_ENGINE_VERSION } from "@/lib/sport/config";
import { generateWorkout } from "@/lib/sport/workoutGenerator";
import type {
  BodyZone,
  FeedbackBodySignal,
  FeedbackCompletion,
  FeedbackDifficulty,
  GeneratedWorkoutSession,
  SportGenerationInput,
  SportOnboardingDraft,
  UserLimitation,
  WorkoutFeedback,
} from "@/lib/sport/types";
import {
  createDefaultSportOnboardingDraft,
  createSportDataFromDraft,
} from "@/services/sport/sportProfileService";

const NOW = "2026-07-15T10:00:00.000Z";
const USER_ID = "user-sport";

function draftWith(
  patch: Partial<SportOnboardingDraft> = {},
): SportOnboardingDraft {
  return {
    ...createDefaultSportOnboardingDraft(),
    ...patch,
  };
}

function inputFromDraft(
  draft: SportOnboardingDraft,
  patch: Partial<SportGenerationInput> = {},
): SportGenerationInput {
  const data = createSportDataFromDraft(draft, NOW, USER_ID);
  return {
    userId: USER_ID,
    activity: "strength",
    requestedDurationMinutes: draft.usualDurationMinutes,
    location: "home",
    equipment: data.equipment,
    limitations: data.limitations,
    capabilities: data.capabilities,
    previousSessions: [],
    feedback: [],
    now: NOW,
    seed: "test-seed",
    ...patch,
  };
}

function feedback(
  session: GeneratedWorkoutSession,
  difficulty: FeedbackDifficulty,
  completion: FeedbackCompletion = "completed",
  bodySignal: FeedbackBodySignal = "none",
): WorkoutFeedback {
  return {
    id: `feedback-${difficulty}-${completion}-${bodySignal}`,
    userId: session.userId,
    sessionId: session.id,
    difficulty,
    completion,
    bodySignal,
    affectedZone: null,
    comment: null,
    createdAt: NOW,
  };
}

function expectSession(result: ReturnType<typeof generateWorkout>): GeneratedWorkoutSession {
  expect(result.session).not.toBeNull();
  return result.session as GeneratedWorkoutSession;
}

function effortSteps(session: GeneratedWorkoutSession) {
  return session.steps.filter((step) => step.type === "effort");
}

function stepDurationTotal(session: GeneratedWorkoutSession): number {
  return session.steps.reduce(
    (total, step) => total + (step.durationSeconds ?? 0),
    0,
  );
}

describe("generateWorkout", () => {
  it("genere une seance de renforcement sans materiel", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));

    expect(session.activity).toBe("strength");
    expect(effortSteps(session).length).toBeGreaterThanOrEqual(2);
    expect(session.reasons.some((reason) => reason.code === "equipment_excluded"))
      .toBe(true);
  });

  it("n'inclut pas un mouvement qui requiert du materiel absent", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));

    expect(effortSteps(session).map((step) => step.exerciseId)).not.toContain(
      "band_row",
    );
  });

  it("inclut le tirage quand un elastique et une capacite de tirage existent", () => {
    const session = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            equipment: ["none", "resistance_band"],
            pullCapability: 2,
            usualDurationMinutes: 20,
          }),
        ),
      ),
    );

    expect(effortSteps(session).map((step) => step.exerciseId)).toContain(
      "band_row",
    );
  });

  it("exclut les mouvements lies a une limitation active", () => {
    const session = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            limitationKind: "pain",
            limitationZone: "knees",
          }),
        ),
      ),
    );

    expect(effortSteps(session).map((step) => step.exerciseId)).not.toContain(
      "bodyweight_squat",
    );
    expect(session.reasons.some((reason) => reason.code === "limitation_excluded"))
      .toBe(true);
  });

  it("choisit une variante prudente selon la capacite de poussee", () => {
    const session = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            equipment: ["none", "mat", "stable_chair"],
            pushCapability: 0,
          }),
        ),
      ),
    );

    expect(effortSteps(session).find((step) => step.exerciseId === "push_up_family")?.variantId)
      .toBe("push_wall");
  });

  it("choisit une variante plus avancee quand capacite et materiel le permettent", () => {
    const session = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            equipment: ["none", "mat", "stable_chair"],
            pushCapability: 2,
          }),
        ),
      ),
    );

    expect(effortSteps(session).find((step) => step.exerciseId === "push_up_family")?.variantId)
      .toBe("push_knees");
  });

  it("respecte la duree demandee", () => {
    const requestedDurationMinutes = 15;
    const session = expectSession(
      generateWorkout(
        inputFromDraft(draftWith({ usualDurationMinutes: requestedDurationMinutes })),
      ),
    );

    expect(session.plannedDurationSeconds).toBeLessThanOrEqual(
      requestedDurationMinutes * 60,
    );
    expect(session.reasons.some((reason) => reason.code === "duration_respected"))
      .toBe(true);
  });

  it("inclut preparation, echauffement, effort, recuperation et retour au calme", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));
    const types = session.steps.map((step) => step.type);

    expect(types).toContain("preparation");
    expect(types).toContain("warmup");
    expect(types).toContain("effort");
    expect(types).toContain("recovery");
    expect(types.at(-1)).toBe("cooldown");
  });

  it("ordonne les etapes de facon stable", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));

    expect(session.steps[0]?.type).toBe("preparation");
    expect(session.steps[1]?.type).toBe("warmup");
    expect(session.steps.map((step) => step.order)).toEqual(
      session.steps.map((_, index) => index + 1),
    );
  });

  it("calcule la duree totale depuis les etapes", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));

    expect(session.plannedDurationSeconds).toBe(stepDurationTotal(session));
  });

  it("renvoie un etat non implemente pour marche, course et natation", () => {
    const result = generateWorkout(inputFromDraft(draftWith(), { activity: "run" }));

    expect(result.session).toBeNull();
    expect(result.reasons[0]?.code).toBe("activity_not_implemented");
  });

  it("produit une seance reproductible a entree identique", () => {
    const input = inputFromDraft(draftWith({ equipment: ["none", "mat"] }));

    const first = expectSession(generateWorkout(input));
    const second = expectSession(generateWorkout(input));

    expect(second).toEqual(first);
  });

  it("fige la version moteur et les raisons structurees", () => {
    const session = expectSession(generateWorkout(inputFromDraft(draftWith())));

    expect(session.generationEngineVersion).toBe(SPORT_ENGINE_VERSION);
    expect(session.generationInputSnapshot.appliedAdjustment.variable).toBe("none");
    expect(session.reasons.length).toBeGreaterThan(3);
  });

  it("augmente uniquement la duree d'effort apres deux retours trop faciles", () => {
    const baseline = expectSession(
      generateWorkout(inputFromDraft(draftWith({ usualDurationMinutes: 20 }))),
    );
    const result = generateWorkout(
      inputFromDraft(draftWith({ usualDurationMinutes: 20 }), {
        previousSessions: [baseline],
        feedback: [
          feedback(baseline, "too_easy"),
          { ...feedback(baseline, "too_easy"), id: "feedback-too-easy-2" },
        ],
        now: "2026-07-15T11:00:00.000Z",
      }),
    );
    const session = expectSession(result);

    expect(session.generationInputSnapshot.appliedAdjustment).toMatchObject({
      variable: "effort_duration",
      direction: "increase",
    });
    expect(session.generationInputSnapshot.appliedAdjustment.variable).not.toBe(
      "round_count",
    );
  });

  it("regresse vers une variante plus simple apres un retour trop difficile", () => {
    const baseline = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            equipment: ["none", "mat", "stable_chair"],
            pushCapability: 2,
          }),
        ),
      ),
    );
    const session = expectSession(
      generateWorkout(
        inputFromDraft(
          draftWith({
            equipment: ["none", "mat", "stable_chair"],
            pushCapability: 2,
          }),
          {
            previousSessions: [baseline],
            feedback: [feedback(baseline, "too_hard")],
            now: "2026-07-15T11:00:00.000Z",
          },
        ),
      ),
    );

    expect(effortSteps(session).find((step) => step.exerciseId === "push_up_family")?.variantId)
      .toBe("push_incline");
    expect(session.generationInputSnapshot.appliedAdjustment).toMatchObject({
      variable: "variant_difficulty",
      direction: "decrease",
    });
  });

  it("ne progresse pas apres une douleur anormale", () => {
    const baseline = expectSession(generateWorkout(inputFromDraft(draftWith())));
    const session = expectSession(
      generateWorkout(
        inputFromDraft(draftWith(), {
          previousSessions: [baseline],
          feedback: [feedback(baseline, "right", "completed", "unusual_pain")],
          now: "2026-07-15T11:00:00.000Z",
        }),
      ),
    );

    expect(session.generationInputSnapshot.appliedAdjustment.direction).toBe(
      "decrease",
    );
  });

  it("retourne une raison explicable quand aucun exercice n'est compatible", () => {
    const data = createSportDataFromDraft(draftWith(), NOW, USER_ID);
    const allZones: BodyZone[] = [
      "shoulders",
      "back",
      "knees",
      "hips",
      "wrists",
      "ankles",
    ];
    const limitations: UserLimitation[] = allZones.map((zone) => ({
      id: `limitation-${zone}`,
      userId: USER_ID,
      kind: "pain",
      zone,
      active: true,
      declaredAt: NOW,
      resolvedAt: null,
      description: null,
    }));

    const result = generateWorkout({
      userId: USER_ID,
      activity: "strength",
      requestedDurationMinutes: 15,
      location: "home",
      equipment: data.equipment,
      limitations,
      capabilities: data.capabilities,
      previousSessions: [],
      feedback: [],
      now: NOW,
    });

    expect(result.session).toBeNull();
    expect(result.reasons.at(-1)?.code).toBe("no_compatible_exercise");
  });
});
