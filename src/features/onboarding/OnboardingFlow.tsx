"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  OnboardingLayout,
  OnboardingQuestion,
} from "@/components/centenaire/OnboardingLayout";
import {
  ONBOARDING_PREPARATION_DURATION_MS,
  OnboardingPreparationScreen,
} from "@/components/centenaire/OnboardingPreparationScreen";
import {
  Button,
  ChoiceCard,
  DateWheelPicker,
  ErrorState,
  FormField,
  HoldChoiceCard,
  IconButton,
  Surface,
  TextInput,
  WheelPicker,
} from "@/components/ui";
import {
  behaviorHypothesisText,
  calculateBmi,
  calculateReferenceGoalWeight,
  classifyAdultBmi,
  toggleExclusiveSelection,
} from "@/lib/onboarding";
import type {
  BehaviorContext,
  PerceivedFriction,
  ProfessionalSupportStatus,
  Profile,
  SmokingGoal,
  SmokingStatus,
} from "@/lib/types";
import { BehaviorFrequencyQuestion } from "@/features/onboarding/BehaviorFrequencyQuestion";
import {
  applyReferenceGoalWeight,
  behaviorContextLabels,
  behaviorQuestions,
  buildBehaviorAssessmentFromDraft,
  buildProfileFromOnboarding,
  createInitialOnboardingDraft,
  getNextOnboardingStep,
  getOnboardingStepError,
  getPreviousOnboardingStep,
  onboardingBirthDateStep,
  onboardingBmiStep,
  onboardingContextsStep,
  onboardingFinalStep,
  onboardingGoalStep,
  onboardingHeightStep,
  onboardingNameStep,
  onboardingPerceivedFrictionsStep,
  onboardingProfessionalSupportStep,
  onboardingSmokingGoalLabels,
  onboardingSmokingGoalStep,
  onboardingSmokingLabels,
  onboardingSmokingStep,
  onboardingWeightStep,
  onboardingWelcomeStep,
  perceivedFrictionLabels,
  professionalSupportLabels,
  type OnboardingDraft,
} from "@/features/onboarding/onboardingModel";

export type OnboardingFlowProps = {
  error: string | null;
  initialStep: number;
  preview: boolean;
  startDate: string;
  onComplete: (profile: Profile) => void;
  onError: (error: string | null) => void;
  onExit: () => void;
};

export function OnboardingFlow({
  error,
  initialStep,
  preview,
  startDate,
  onComplete,
  onError,
  onExit,
}: OnboardingFlowProps) {
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    createInitialOnboardingDraft(startDate),
  );
  const [step, setStep] = useState(initialStep);
  const [finalPreparationComplete, setFinalPreparationComplete] =
    useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (step !== onboardingFinalStep || finalPreparationComplete) return;

    const timer = window.setTimeout(() => {
      setFinalPreparationComplete(true);
    }, ONBOARDING_PREPARATION_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [finalPreparationComplete, step]);

  if (step === onboardingFinalStep && !finalPreparationComplete) {
    return <OnboardingPreparationScreen />;
  }

  const updateDraft = (nextDraft: OnboardingDraft) => {
    setDraft(nextDraft);
    onError(null);
  };
  const answerAndContinue = (
    nextDraft: OnboardingDraft,
    nextStep: number,
  ) => {
    setDraft(nextDraft);
    onError(null);
    setStep(nextStep);
  };
  const goBack = () => {
    if (step === onboardingNameStep) {
      onExit();
      return;
    }
    setStep(getPreviousOnboardingStep(step, draft));
  };
  const goNext = () => {
    const stepError = getOnboardingStepError(draft, step);
    if (stepError) {
      onError(stepError);
      return;
    }

    if (step < onboardingFinalStep) {
      const nextDraft =
        step === onboardingBmiStep ? applyReferenceGoalWeight(draft) : draft;
      if (nextDraft !== draft) setDraft(nextDraft);
      onError(null);
      setStep(getNextOnboardingStep(step, nextDraft));
      return;
    }

    if (preview) {
      onError(null);
      setStep(onboardingNameStep);
      return;
    }

    onComplete(buildProfileFromOnboarding(draft));
  };

  const showPrimaryAction = [
    onboardingNameStep,
    onboardingBirthDateStep,
    onboardingHeightStep,
    onboardingWeightStep,
    onboardingBmiStep,
    onboardingGoalStep,
    onboardingContextsStep,
    onboardingPerceivedFrictionsStep,
    onboardingProfessionalSupportStep,
    onboardingFinalStep,
  ].includes(step);
  const primaryLabel =
    step === onboardingFinalStep
      ? "Commencer les 7 jours"
      : step === onboardingProfessionalSupportStep &&
          draft.professionalSupport === undefined
        ? "Passer"
        : "Continuer";
  const progressStep = Math.min(step, onboardingFinalStep - 1);
  const bmi = calculateBmi(
    Number(draft.startWeightKg),
    Number(draft.heightCm),
  );
  const bmiClassification = bmi === null ? null : classifyAdultBmi(bmi);
  const referenceGoalWeight = calculateReferenceGoalWeight(
    Number(draft.startWeightKg),
    Number(draft.heightCm),
  );
  const assessmentPreview = buildBehaviorAssessmentFromDraft(
    draft,
    new Date().toISOString(),
  );
  const behaviorQuestion = behaviorQuestions[step];

  return (
    <OnboardingLayout
      actions={
        showPrimaryAction ? (
          <Button fullWidth onClick={goNext}>
            {primaryLabel}
          </Button>
        ) : null
      }
      backAction={
        step > onboardingWelcomeStep ? (
          <IconButton
            className="rounded-full border-transparent"
            label="Retour"
            onClick={goBack}
          >
            <ChevronLeft aria-hidden="true" size={24} />
          </IconButton>
        ) : undefined
      }
      currentStep={progressStep}
      error={error ? <ErrorState message={error} /> : undefined}
      showProgress={step > 0 && step < onboardingFinalStep}
      totalSteps={onboardingFinalStep - 1}
    >
      {step === onboardingNameStep ? (
        <OnboardingQuestion
          description="Le carnet utilise ce prénom uniquement dans l’application."
          title="Comment tu veux qu’on t’appelle ?"
        >
          <FormField id="onboarding-first-name" label="Prénom">
            <TextInput
              autoComplete="given-name"
              value={draft.firstName}
              onChange={(event) =>
                updateDraft({ ...draft, firstName: event.target.value })
              }
            />
          </FormField>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingBirthDateStep ? (
        <OnboardingQuestion title="Quelle est ta date de naissance ?">
          <DateWheelPicker
            onChange={(value) => updateDraft({ ...draft, birthDate: value })}
            referenceDate={draft.startDate}
            value={draft.birthDate}
          />
        </OnboardingQuestion>
      ) : null}

      {step === onboardingHeightStep ? (
        <OnboardingQuestion title="Quelle est ta taille ?">
          <WheelPicker
            ariaLabel="Taille"
            max={220}
            min={100}
            onChange={(value) => updateDraft({ ...draft, heightCm: value })}
            suggestedValue={170}
            unit="cm"
            value={draft.heightCm}
          />
        </OnboardingQuestion>
      ) : null}

      {step === onboardingWeightStep ? (
        <OnboardingQuestion title="Quel est ton poids actuel ?">
          <WheelPicker
            ariaLabel="Poids actuel"
            max={250}
            min={30}
            onChange={(value) => updateDraft({ ...draft, startWeightKg: value })}
            suggestedValue={100}
            unit="kg"
            value={draft.startWeightKg}
          />
        </OnboardingQuestion>
      ) : null}

      {step === onboardingBmiStep && bmi !== null && bmiClassification ? (
        <section className="space-y-6" aria-labelledby="onboarding-bmi-title">
          <div className="space-y-3">
            <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
              État des lieux
            </p>
            <h1
              className="max-w-[18ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
              id="onboarding-bmi-title"
            >
              Ton point de départ
            </h1>
          </div>
          <Surface className="space-y-4 p-5 min-[390px]:p-6">
            <div>
              <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
                IMC estimé
              </p>
              <p className="mt-1 text-4xl leading-none font-bold text-[var(--pc-color-text)]">
                {bmi.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}
              </p>
            </div>
            <p className="text-base leading-6 text-[var(--pc-color-text)]">
              Selon les repères adultes, cette valeur se situe{" "}
              {bmiClassification.visibleLabel}.
            </p>
            <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
              C’est un indicateur de santé, pas un jugement. Il ne résume ni ta
              santé, ni ta valeur, ni les raisons de ta situation.
            </p>
            <p className="text-xs leading-5 text-[var(--pc-color-text-muted)]">
              Repère médical · {bmiClassification.medicalLabel}
            </p>
          </Surface>
          <p className="text-base leading-6 text-[var(--pc-color-text-muted)]">
            Haru va maintenant chercher les situations et les habitudes qui
            méritent d’être observées.
          </p>
        </section>
      ) : null}

      {step === onboardingGoalStep ? (
        <OnboardingQuestion
          description={
            referenceGoalWeight === null
              ? "C’est un repère. Il pourra évoluer plus tard."
              : `Le « poids idéal » n’est pas une valeur absolue. Haru a placé la roue sur ${referenceGoalWeight} kg, un repère calculé à partir de ta taille et de la zone d’IMC de référence. Tu peux le modifier.`
          }
          title="Quel poids veux-tu viser pour commencer ?"
        >
          <WheelPicker
            ariaLabel="Objectif de poids"
            max={250}
            min={30}
            onChange={(value) =>
              updateDraft({
                ...draft,
                goalWeightKg: value,
                goalWeightIsCustom: true,
              })
            }
            suggestedValue={
              referenceGoalWeight ?? (Number(draft.startWeightKg) || 80)
            }
            unit="kg"
            value={draft.goalWeightKg}
          />
        </OnboardingQuestion>
      ) : null}

      {behaviorQuestion ? (
        <BehaviorFrequencyQuestion
          answer={draft.behaviorAnswers[behaviorQuestion.key]}
          questionId={behaviorQuestion.key}
          title={behaviorQuestion.title}
          onSelect={(answer) => {
            const nextDraft = {
              ...draft,
              behaviorAnswers: {
                ...draft.behaviorAnswers,
                [behaviorQuestion.key]: answer,
              },
            };
            answerAndContinue(
              nextDraft,
              Math.min(onboardingContextsStep, step + 1),
            );
          }}
        />
      ) : null}

      {step === onboardingContextsStep ? (
        <OnboardingQuestion
          description="Tu peux en choisir plusieurs. Les deux dernières réponses sont exclusives."
          title="Dans quelles situations cela arrive-t-il le plus souvent ?"
        >
          <div className="grid gap-2">
            {Object.entries(behaviorContextLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.contexts.includes(key as BehaviorContext)}
                key={key}
                label={label}
                name="behavior-context"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  updateDraft({
                    ...draft,
                    contexts: toggleExclusiveSelection(
                      draft.contexts,
                      key as BehaviorContext,
                      event.target.checked,
                      ["no-specific-context", "unknown"],
                    ),
                  })
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingPerceivedFrictionsStep ? (
        <OnboardingQuestion
          description="Tu peux en choisir plusieurs. Le carnet vérifiera ensuite cette première impression."
          title="Qu’est-ce qui semble le plus te freiner aujourd’hui ?"
        >
          <div className="grid gap-2">
            {Object.entries(perceivedFrictionLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.perceivedFrictions.includes(
                  key as PerceivedFriction,
                )}
                key={key}
                label={label}
                name="perceived-friction"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  updateDraft({
                    ...draft,
                    perceivedFrictions: toggleExclusiveSelection(
                      draft.perceivedFrictions,
                      key as PerceivedFriction,
                      event.target.checked,
                      ["unknown"],
                    ),
                  })
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingProfessionalSupportStep ? (
        <OnboardingQuestion
          description="Cette question est facultative. Haru reste un outil d’observation et ne remplace pas cet accompagnement."
          title="Es-tu actuellement accompagné par un professionnel pour ton poids, ton alimentation ou un trouble alimentaire ?"
        >
          <div className="grid gap-2">
            {Object.entries(professionalSupportLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.professionalSupport === key}
                key={key}
                label={label}
                name="professional-support"
                value={key}
                onChange={() =>
                  updateDraft({
                    ...draft,
                    professionalSupport: key as ProfessionalSupportStatus,
                  })
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingSmokingStep ? (
        <OnboardingQuestion
          description="Le tabac sera suivi séparément de l’alimentation."
          title="Tu fumes actuellement ?"
        >
          <div aria-label="Statut tabac" className="grid gap-2" role="radiogroup">
            {Object.entries(onboardingSmokingLabels).map(([key, label]) => (
              <HoldChoiceCard
                checked={draft.smokingStatus === key}
                key={key}
                label={label}
                onConfirm={() => {
                  const nextDraft = {
                    ...draft,
                    smokingStatus: key as SmokingStatus,
                    smokingGoal: undefined,
                  };
                  answerAndContinue(
                    nextDraft,
                    getNextOnboardingStep(step, nextDraft),
                  );
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingSmokingGoalStep ? (
        <OnboardingQuestion
          description="Cette réponse sert seulement à adapter le suivi tabac."
          title="Qu’aimerais-tu faire concernant le tabac ?"
        >
          <div aria-label="Objectif tabac" className="grid gap-2" role="radiogroup">
            {Object.entries(onboardingSmokingGoalLabels).map(([key, label]) => (
              <HoldChoiceCard
                checked={draft.smokingGoal === key}
                key={key}
                label={label}
                onConfirm={() => {
                  const nextDraft = {
                    ...draft,
                    smokingGoal: key as SmokingGoal,
                  };
                  answerAndContinue(nextDraft, onboardingFinalStep);
                }}
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === onboardingFinalStep ? (
        <OnboardingSummary
          assessment={assessmentPreview}
          bmi={bmi}
          goalWeightKg={draft.goalWeightKg}
        />
      ) : null}
    </OnboardingLayout>
  );
}

function OnboardingSummary({
  assessment,
  bmi,
  goalWeightKg,
}: {
  assessment: ReturnType<typeof buildBehaviorAssessmentFromDraft>;
  bmi: number | null;
  goalWeightKg: string;
}) {
  return (
    <section className="space-y-5" aria-labelledby="onboarding-priority">
      <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
        Ton bilan
      </p>
      <h1
        className="max-w-[19ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
        id="onboarding-priority"
      >
        Voilà ce que nous allons observer.
      </h1>
      <dl className="grid grid-cols-2 gap-3">
        {bmi !== null ? (
          <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] p-4">
            <dt className="text-xs font-semibold text-[var(--pc-color-text-muted)]">
              IMC estimé
            </dt>
            <dd className="mt-1 text-2xl font-bold text-[var(--pc-color-text)]">
              {bmi.toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              })}
            </dd>
          </div>
        ) : null}
        <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]">
          <dt className="text-xs font-semibold text-[var(--pc-color-text-muted)]">
            Poids visé
          </dt>
          <dd className="mt-1 text-2xl font-bold text-[var(--pc-color-text)]">
            {goalWeightKg} kg
          </dd>
        </div>
      </dl>
      <Surface className="space-y-3 p-5" variant="subtle">
        <p className="text-sm font-semibold text-[var(--pc-color-text)]">
          {assessment.hypotheses.length > 0
            ? assessment.hypotheses.length === 1
              ? "Une piste mérite d’être observée"
              : "Deux pistes méritent d’être observées"
            : "Aucune tendance nette pour le moment"}
        </p>
        {assessment.hypotheses.length > 0 ? (
          <ul className="space-y-3">
            {assessment.hypotheses.map((hypothesis) => (
              <li
                className="flex gap-3 text-sm leading-6 text-[var(--pc-color-text-muted)]"
                key={hypothesis.axis}
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
                />
                {behaviorHypothesisText(hypothesis.axis)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
            Tes réponses ne dessinent pas de piste dominante. C’est aussi une
            information utile.
          </p>
        )}
      </Surface>
      <Surface className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Les 7 prochains jours
          </p>
          <h2 className="text-xl leading-7 font-bold text-[var(--pc-color-text)]">
            Vis comme d’habitude.
          </h2>
        </div>
        <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
          Avant de commencer à changer tes habitudes, j’ai besoin de comprendre
          comment tu fonctionnes vraiment. Pendant sept jours, mange et organise
          tes journées comme tu le fais habituellement. Ne change rien exprès
          pour l’application.
        </p>
        <ul className="space-y-3 text-sm leading-6 text-[var(--pc-color-text-muted)]">
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
            />
            Renseigne chaque repas avec soin : contenu, quantités, faim et
            sensations.
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--pc-color-primary)]"
            />
            Sois honnête, même lorsque la journée ne se déroule pas comme prévu.
          </li>
        </ul>
        <p className="text-sm leading-6 font-semibold text-[var(--pc-color-text)]">
          Il n’y a rien à réussir ni à rater. Plus les faits seront fidèles à
          ton quotidien, plus je pourrai t’aider justement.
        </p>
      </Surface>
    </section>
  );
}
