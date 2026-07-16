"use client";

import { OnboardingQuestion } from "@/components/centenaire/OnboardingLayout";
import { holdChoiceInstanceKey, HoldChoiceCard } from "@/components/ui";
import type { BehaviorFrequency } from "@/lib/types";
import { behaviorFrequencyChoices } from "@/features/onboarding/onboardingModel";

export function BehaviorFrequencyQuestion({
  answer,
  onSelect,
  questionId,
  title,
}: {
  answer: BehaviorFrequency | undefined;
  onSelect: (answer: BehaviorFrequency) => void;
  questionId: string;
  title: string;
}) {
  return (
    <OnboardingQuestion title={title}>
      <div aria-label={title} className="grid gap-2" role="radiogroup">
        {behaviorFrequencyChoices.map((choice) => (
          <HoldChoiceCard
            checked={answer === choice.value}
            key={holdChoiceInstanceKey(questionId, choice.value)}
            label={choice.label}
            onConfirm={() => onSelect(choice.value)}
          />
        ))}
      </div>
    </OnboardingQuestion>
  );
}
