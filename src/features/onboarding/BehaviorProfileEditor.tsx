"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  OnboardingLayout,
  OnboardingQuestion,
} from "@/components/centenaire/OnboardingLayout";
import {
  Button,
  ChoiceCard,
  ErrorState,
  IconButton,
  Surface,
} from "@/components/ui";
import {
  behaviorHypothesisText,
  toggleExclusiveSelection,
} from "@/lib/onboarding";
import type {
  BehaviorContext,
  InitialBehaviorAssessment,
  PerceivedFriction,
  ProfessionalSupportStatus,
} from "@/lib/types";
import { BehaviorFrequencyQuestion } from "@/features/onboarding/BehaviorFrequencyQuestion";
import {
  behaviorContextLabels,
  behaviorQuestions,
  buildBehaviorAssessmentFromDraft,
  createBehaviorAssessmentDraft,
  hasCompleteBehaviorAnswers,
  onboardingBehaviorStartStep,
  perceivedFrictionLabels,
  professionalSupportLabels,
  type BehaviorAssessmentDraft,
} from "@/features/onboarding/onboardingModel";

const behaviorEditorFinalStep = 10;

export function BehaviorProfileEditor({
  initialAssessment,
  onCancel,
  onSave,
}: {
  initialAssessment?: InitialBehaviorAssessment;
  onCancel: () => void;
  onSave: (assessment: InitialBehaviorAssessment) => void;
}) {
  const [step, setStep] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BehaviorAssessmentDraft>(() =>
    createBehaviorAssessmentDraft(initialAssessment),
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  const question = behaviorQuestions[onboardingBehaviorStartStep + step];
  const assessmentPreview = buildBehaviorAssessmentFromDraft(
    draft,
    new Date().toISOString(),
  );

  const goForward = () => {
    if (step === 7 && draft.contexts.length === 0) {
      setEditorError("Choisis au moins une situation.");
      return;
    }
    if (step === 8 && draft.perceivedFrictions.length === 0) {
      setEditorError("Choisis au moins un point.");
      return;
    }
    if (step === behaviorEditorFinalStep) {
      if (!hasCompleteBehaviorAnswers(draft.behaviorAnswers)) {
        setEditorError("Complète les réponses précédentes.");
        return;
      }
      onSave(buildBehaviorAssessmentFromDraft(draft, new Date().toISOString()));
      return;
    }

    setEditorError(null);
    setStep((current) => Math.min(behaviorEditorFinalStep, current + 1));
  };

  return (
    <OnboardingLayout
      actions={
        step >= 7 ? (
          <Button fullWidth onClick={goForward}>
            {step === behaviorEditorFinalStep
              ? "Enregistrer le portrait"
              : step === 9 && draft.professionalSupport === undefined
                ? "Passer"
                : "Continuer"}
          </Button>
        ) : null
      }
      backAction={
        <IconButton
          className="rounded-full border-transparent"
          label={step === 0 ? "Fermer" : "Retour"}
          onClick={() => {
            if (step === 0) {
              onCancel();
              return;
            }
            setEditorError(null);
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          <ChevronLeft aria-hidden="true" size={24} />
        </IconButton>
      }
      currentStep={Math.min(step + 1, behaviorEditorFinalStep)}
      error={editorError ? <ErrorState message={editorError} /> : undefined}
      showProgress={step < behaviorEditorFinalStep}
      totalSteps={behaviorEditorFinalStep}
    >
      {question ? (
        <BehaviorFrequencyQuestion
          answer={draft.behaviorAnswers[question.key]}
          questionId={question.key}
          title={question.title}
          onSelect={(answer) => {
            setDraft((current) => ({
              ...current,
              behaviorAnswers: {
                ...current.behaviorAnswers,
                [question.key]: answer,
              },
            }));
            setEditorError(null);
            setStep((current) => current + 1);
          }}
        />
      ) : null}

      {step === 7 ? (
        <OnboardingQuestion title="Dans quelles situations cela arrive-t-il le plus souvent ?">
          <div className="grid gap-2">
            {Object.entries(behaviorContextLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.contexts.includes(key as BehaviorContext)}
                key={key}
                label={label}
                name="profile-behavior-context"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contexts: toggleExclusiveSelection(
                      current.contexts,
                      key as BehaviorContext,
                      event.target.checked,
                      ["no-specific-context", "unknown"],
                    ),
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === 8 ? (
        <OnboardingQuestion title="Qu’est-ce qui semble le plus te freiner aujourd’hui ?">
          <div className="grid gap-2">
            {Object.entries(perceivedFrictionLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.perceivedFrictions.includes(
                  key as PerceivedFriction,
                )}
                key={key}
                label={label}
                name="profile-perceived-friction"
                type="checkbox"
                value={key}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    perceivedFrictions: toggleExclusiveSelection(
                      current.perceivedFrictions,
                      key as PerceivedFriction,
                      event.target.checked,
                      ["unknown"],
                    ),
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === 9 ? (
        <OnboardingQuestion
          description="Cette question est facultative."
          title="Es-tu actuellement accompagné par un professionnel pour ton poids, ton alimentation ou un trouble alimentaire ?"
        >
          <div className="grid gap-2">
            {Object.entries(professionalSupportLabels).map(([key, label]) => (
              <ChoiceCard
                checked={draft.professionalSupport === key}
                key={key}
                label={label}
                name="profile-professional-support"
                value={key}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    professionalSupport: key as ProfessionalSupportStatus,
                  }))
                }
              />
            ))}
          </div>
        </OnboardingQuestion>
      ) : null}

      {step === behaviorEditorFinalStep ? (
        <section className="space-y-5" aria-labelledby="behavior-editor-summary">
          <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
            Portrait initial
          </p>
          <h1
            className="max-w-[19ch] text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]"
            id="behavior-editor-summary"
          >
            Tes pistes à observer
          </h1>
          <Surface className="space-y-3 p-5" variant="subtle">
            {assessmentPreview.hypotheses.length > 0 ? (
              <ul className="space-y-3">
                {assessmentPreview.hypotheses.map((hypothesis) => (
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
                Aucune tendance nette ne ressort pour le moment.
              </p>
            )}
          </Surface>
          <p className="text-sm leading-6 text-[var(--pc-color-text-muted)]">
            Cette mise à jour remplace tes réponses déclarées. Les notes déjà
            présentes dans le carnet restent intactes.
          </p>
        </section>
      ) : null}
    </OnboardingLayout>
  );
}
