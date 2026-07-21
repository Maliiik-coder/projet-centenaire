"use client";

import { useState } from "react";
import { Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { buildImmediateFinding } from "@/lib/analytics";
import { activeMealKindLabels } from "@/lib/mealKinds";
import { getMealTunnelStepIds } from "@/lib/mealTunnel";
import { searchFoodAutocomplete } from "@/lib/nutrition/autocompleteFood";
import { INITIAL_OBSERVATION_MEAL_MESSAGE } from "@/lib/observationPhase";
import type {
  MealPassageRelation,
  ReserviceReason,
} from "@/lib/types";
import {
  addMealFoodSelection,
  advanceMealTunnel,
  fullnessLabels,
  hungerLabels,
  previousMealTunnelStep,
  removeMealFoodSelection,
  reserviceHungerLabels,
  reserviceReasonLabels,
  reserviceRelationLabels,
  sanitizeMealDraftForKind,
  servingPatternLabels,
  snackContextLabels,
  snackTriggerLabels,
  toggleReserviceReason,
  type MealDraft,
} from "@/features/meal/mealDraftModel";
import {
  ClarificationQuestion,
  FoodSuggestionPicker,
  FindingPart,
  MealTunnelButton,
  QuantityFields,
  SelectedFoodChips,
  TunnelChoiceLine,
  TunnelQuestion,
  mealAnnotationClass as annotationClass,
  mealInputClass as inputClass,
} from "@/features/meal/MealTunnelControls";

export type MealTunnelScreenProps = {
  draft: MealDraft;
  initialObservationActive: boolean;
  submitLabel: string;
  onAdd: () => void;
  onChange: (draft: MealDraft) => void;
  onClose: () => void;
  onError: (error: string | null) => void;
};

export function MealTunnelScreen({
  draft,
  initialObservationActive,
  submitLabel,
  onAdd,
  onChange,
  onClose,
  onError,
}: MealTunnelScreenProps) {
  const [step, setStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const stepIds = getMealTunnelStepIds(draft.kind);
  const stepId = stepIds[step] ?? stepIds[0];
  const foodSuggestions =
    stepId === "text" || stepId === "snack-text"
      ? searchFoodAutocomplete(draft.freeText)
      : [];
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
  const showNextButton =
    stepId === "time" ||
    stepId === "text" ||
    stepId === "snack-text" ||
    stepId === "starter" ||
    stepId === "dessert" ||
    stepId === "clarifications" ||
    stepId === "quantity" ||
    stepId === "reservice-detail" ||
    stepId === "reservice-reason";

  const goNext = (nextDraft: MealDraft = draft) => {
    const next = advanceMealTunnel(nextDraft, step);
    onError(next.error);
    if (next.error) return;

    onChange(next.draft);
    setStep(next.step);
  };

  const choose = (nextDraft: MealDraft) => {
    onChange(nextDraft);
    goNext(nextDraft);
  };

  return (
    <div className="app-fixed-panel z-30">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <div className="pc-halo-surface mb-8 flex items-center justify-between rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 shadow-[var(--pc-shadow-level-1)]">
          <p className={annotationClass}>
            Observation {step + 1}/{stepIds.length}
          </p>
          <button
            className="text-sm font-semibold text-[var(--pc-color-text)]"
            type="button"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-3">
          {stepId === "kind" ? (
            <TunnelQuestion title="Type de repas">
              <TunnelChoiceLine
                options={activeMealKindLabels}
                value={draft.kind}
                onPick={(value) =>
                  choose(sanitizeMealDraftForKind({ ...draft, kind: value }))
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "time" ? (
            <TunnelQuestion title="À quelle heure as-tu mangé ?">
              <div className="grid gap-4">
                <input
                  className="pc-halo-control min-h-16 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-3xl font-semibold tabular-nums text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
                  type="time"
                  value={draft.time}
                  onChange={(event) =>
                    onChange({ ...draft, time: event.target.value })
                  }
                />
                <div className="flex justify-end">
                  <button
                    className="text-xs font-semibold text-[var(--pc-color-text-muted)] underline-offset-4 hover:text-[var(--pc-color-text)] hover:underline"
                    type="button"
                    onClick={() => setShowDatePicker((current) => !current)}
                  >
                    {showDatePicker ? "Masquer la date" : "Changer la date"}
                  </button>
                </div>
                {showDatePicker ? (
                  <label className="grid gap-2 text-sm font-semibold text-[var(--pc-color-text-muted)]">
                    Date du repas
                    <input
                      className={inputClass}
                      type="date"
                      value={draft.date}
                      onChange={(event) =>
                        onChange({ ...draft, date: event.target.value })
                      }
                    />
                  </label>
                ) : null}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "text" || stepId === "snack-text" ? (
            <section className="space-y-6">
              <p className={annotationClass}>Contenu</p>
              <h1 className="font-serif text-3xl leading-tight">
                {stepId === "snack-text"
                  ? "Tu as grignoté quoi ?"
                  : "Note ce que tu as mangé, simplement."}
              </h1>
              <FoodSuggestionPicker
                suggestions={foodSuggestions}
                onPick={(suggestion) =>
                  onChange(addMealFoodSelection(draft, suggestion))
                }
              />
              <SelectedFoodChips
                foods={draft.selectedFoods}
                onRemove={(foodId) =>
                  onChange(removeMealFoodSelection(draft, foodId))
                }
              />
              <textarea
                className="pc-halo-control min-h-40 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 text-lg leading-8 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
                value={draft.freeText}
                onChange={(event) =>
                  onChange({ ...draft, freeText: event.target.value })
                }
                placeholder="Exemple : pâtes, deux steaks, sauce au poivre"
              />
            </section>
          ) : null}

          {stepId === "starter" ? (
            <TunnelQuestion title="Tu as pris une entrée ?">
              <TunnelChoiceLine
                options={{ non: "Non", oui: "Oui" }}
                value={draft.starterTaken ? "oui" : "non"}
                onPick={(value) => {
                  if (value === "non") {
                    choose({ ...draft, starterTaken: false, starterText: "" });
                    return;
                  }
                  onChange({ ...draft, starterTaken: true });
                }}
              />
              {draft.starterTaken ? (
                <div className="grid gap-4">
                  <input
                    className={inputClass}
                    value={draft.starterText}
                    onChange={(event) =>
                      onChange({ ...draft, starterText: event.target.value })
                    }
                    placeholder="C’était quoi ?"
                  />
                  <QuantityFields
                    label="Quantité approximative"
                    value={draft.starterQuantity}
                    onChange={(starterQuantity) =>
                      onChange({ ...draft, starterQuantity })
                    }
                  />
                </div>
              ) : null}
            </TunnelQuestion>
          ) : null}

          {stepId === "dessert" ? (
            <TunnelQuestion title="Tu as pris un dessert ?">
              <TunnelChoiceLine
                options={{ non: "Non", oui: "Oui" }}
                value={draft.dessertTaken ? "oui" : "non"}
                onPick={(value) => {
                  if (value === "non") {
                    choose({ ...draft, dessertTaken: false, dessertText: "" });
                    return;
                  }
                  onChange({ ...draft, dessertTaken: true });
                }}
              />
              {draft.dessertTaken ? (
                <div className="grid gap-4">
                  <input
                    className={inputClass}
                    value={draft.dessertText}
                    onChange={(event) =>
                      onChange({ ...draft, dessertText: event.target.value })
                    }
                    placeholder="C’était quoi ?"
                  />
                  <QuantityFields
                    label="Quantité approximative"
                    value={draft.dessertQuantity}
                    onChange={(dessertQuantity) =>
                      onChange({ ...draft, dessertQuantity })
                    }
                  />
                </div>
              ) : null}
            </TunnelQuestion>
          ) : null}

          {stepId === "quantity" ? (
            <TunnelQuestion
              title={
                draft.kind === "grignotage"
                  ? "Tu en as pris quelle quantité ?"
                  : "Tu dirais quelle quantité ?"
              }
            >
              <QuantityFields
                label="Quantité approximative"
                value={
                  draft.kind === "grignotage"
                    ? draft.snackQuantity
                    : draft.mainQuantity
                }
                onChange={(quantity) =>
                  onChange(
                    draft.kind === "grignotage"
                      ? { ...draft, snackQuantity: quantity }
                      : { ...draft, mainQuantity: quantity },
                  )
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "serving" ? (
            <TunnelQuestion title="Tu as repris ou ajouté une portion ?">
              <TunnelChoiceLine
                options={servingPatternLabels}
                value={draft.servingPattern}
                onPick={(value) =>
                  choose({
                    ...draft,
                    servingPattern: value,
                    hungerAtReservice:
                      value === "none" ? null : draft.hungerAtReservice,
                    reserviceReasons:
                      value === "none" ? [] : draft.reserviceReasons,
                    reserviceRelation:
                      value === "none" ? null : draft.reserviceRelation,
                    reserviceText: value === "none" ? "" : draft.reserviceText,
                  })
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-detail" ? (
            <TunnelQuestion title="La reprise contenait quoi ?">
              <div className="grid gap-4">
                <TunnelChoiceLine
                  options={reserviceRelationLabels}
                  value={
                    (draft.reserviceRelation ?? "__none") as MealPassageRelation
                  }
                  onPick={(value) =>
                    onChange({
                      ...draft,
                      reserviceRelation: value,
                      reserviceText:
                        value === "same" ? "" : draft.reserviceText,
                    })
                  }
                />
                {draft.reserviceRelation &&
                draft.reserviceRelation !== "same" ? (
                  <input
                    className={inputClass}
                    value={draft.reserviceText}
                    onChange={(event) =>
                      onChange({ ...draft, reserviceText: event.target.value })
                    }
                    placeholder="Exemple : juste des frites, un peu de pâtes"
                  />
                ) : null}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-hunger" ? (
            <TunnelQuestion title="Au moment de te resservir, tu avais encore faim ?">
              <TunnelChoiceLine
                options={reserviceHungerLabels}
                value={draft.hungerAtReservice ?? "unsure"}
                onPick={(value) => choose({ ...draft, hungerAtReservice: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "reservice-reason" ? (
            <TunnelQuestion title="Qu’est-ce qui a joué ?">
              <div className="grid gap-2">
                {Object.entries(reserviceReasonLabels).map(([key, label]) => {
                  const reason = key as ReserviceReason;
                  const selected = draft.reserviceReasons.includes(reason);

                  return (
                    <button
                      className={`pc-halo-surface pc-halo-surface-interactive min-h-12 rounded-[18px] border px-4 text-left text-base transition active:scale-[0.99] ${
                        selected
                          ? "pc-halo-selected border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                          : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                      }`}
                      key={key}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          reserviceReasons: toggleReserviceReason(
                            draft.reserviceReasons,
                            reason,
                          ),
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </TunnelQuestion>
          ) : null}

          {stepId === "hunger" ? (
            <TunnelQuestion title="Tu avais vraiment faim ?">
              <TunnelChoiceLine
                options={{
                  yes: hungerLabels.yes,
                  not_really: hungerLabels.not_really,
                  no: hungerLabels.no,
                  unsure: hungerLabels.unsure,
                }}
                value={draft.hungerBefore}
                onPick={(value) => choose({ ...draft, hungerBefore: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "fullness" || stepId === "snack-fullness" ? (
            <TunnelQuestion
              title={
                stepId === "snack-fullness"
                  ? "Après, tu étais comment ?"
                  : "Après le repas, tu étais comment ?"
              }
            >
              <TunnelChoiceLine
                options={fullnessLabels}
                value={draft.fullnessAfter}
                onPick={(value) =>
                  choose({ ...draft, fullnessAfter: value, afterMeal: value })
                }
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "snack-trigger" ? (
            <TunnelQuestion title="Pourquoi tu as mangé ?">
              <TunnelChoiceLine
                options={snackTriggerLabels}
                value={draft.snackTrigger ?? "unsure"}
                onPick={(value) => choose({ ...draft, snackTrigger: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "snack-context" ? (
            <TunnelQuestion title="Tu étais où ?">
              <TunnelChoiceLine
                options={snackContextLabels}
                value={draft.snackContext ?? "other"}
                onPick={(value) => choose({ ...draft, snackContext: value })}
              />
            </TunnelQuestion>
          ) : null}

          {stepId === "clarifications" ? (
            <section className="space-y-4">
              <p className={annotationClass}>Petite précision</p>
              <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
                Je te demande juste ça.
              </h1>
              {draft.clarifications.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {draft.clarifications.slice(0, 3).map((clarification) => (
                    <ClarificationQuestion
                      clarification={clarification}
                      key={clarification.key}
                      onChange={(nextClarification) =>
                        onChange({
                          ...draft,
                          clarifications: draft.clarifications.map((item) =>
                            item.key === nextClarification.key
                              ? nextClarification
                              : item,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {stepId === "finding" ? (
            <section className="space-y-6">
              <FindingPart title="Ce que je vois" text={finding.fact} emphasized />
              {initialObservationActive ? (
                <>
                  <div className="pc-halo-surface pc-halo-surface-subtle rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <FindingPart title="Lecture rapide" text={finding.reading} />
                  </div>
                  <div className="pc-halo-surface pc-halo-surface-subtle rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <FindingPart
                      title="Pour l’instant"
                      text={INITIAL_OBSERVATION_MEAL_MESSAGE}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="pc-halo-surface pc-halo-surface-subtle space-y-5 rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <FindingPart title="Point à surveiller" text={finding.reading} />
                    <FindingPart title="Prochaine fois" text={finding.nextAction} />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
                    {finding.evidenceLevel}
                  </p>
                </>
              )}
            </section>
          ) : null}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <MealTunnelButton
              variant="line"
              onClick={() => setStep(previousMealTunnelStep(draft, step))}
            >
              <ChevronLeft aria-hidden="true" size={17} />
              Retour
            </MealTunnelButton>
          ) : (
            <span />
          )}
          {showNextButton ? (
            <MealTunnelButton onClick={() => goNext()}>
              Continuer
              <ChevronRight aria-hidden="true" size={17} />
            </MealTunnelButton>
          ) : null}
          {stepId === "finding" ? (
            <MealTunnelButton onClick={onAdd}>
              <Archive aria-hidden="true" size={17} />
              {submitLabel}
            </MealTunnelButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
