"use client";

import { useState, type ReactNode } from "react";
import { Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { buildImmediateFinding } from "@/lib/analytics";
import { getClarificationChoices } from "@/lib/foodDetection";
import { activeMealKindLabels } from "@/lib/mealKinds";
import { getMealTunnelStepIds } from "@/lib/mealTunnel";
import { INITIAL_OBSERVATION_MEAL_MESSAGE } from "@/lib/observationPhase";
import type {
  MealClarification,
  MealPassageRelation,
  MealQuantityUnit,
  ReserviceReason,
} from "@/lib/types";
import {
  advanceMealTunnel,
  fullnessLabels,
  hungerLabels,
  previousMealTunnelStep,
  quickQuantityUnits,
  quantityUnitLabels,
  reserviceHungerLabels,
  reserviceReasonLabels,
  reserviceRelationLabels,
  sanitizeMealDraftForKind,
  servingPatternLabels,
  snackContextLabels,
  snackTriggerLabels,
  type MealDraft,
  type MealQuantityDraft,
} from "@/features/meal/mealDraftModel";

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";
const annotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";

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
  const finding = buildImmediateFinding({
    kind: draft.kind,
    servingPattern: draft.servingPattern,
    hungerBefore: draft.hungerBefore,
    fullnessAfter: draft.fullnessAfter,
    starterTaken: draft.starterTaken,
    dessertTaken: draft.dessertTaken,
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
        <div className="mb-8 flex items-center justify-between rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 shadow-[var(--pc-shadow-level-1)]">
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
                  className="min-h-16 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-3xl font-semibold tabular-nums text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
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
              <textarea
                className="min-h-40 rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 text-lg leading-8 text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]"
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
                      className={`min-h-12 rounded-[18px] border px-4 text-left text-base transition active:scale-[0.99] ${
                        selected
                          ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                          : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                      }`}
                      key={key}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          reserviceReasons: selected
                            ? draft.reserviceReasons.filter(
                                (item) => item !== reason,
                              )
                            : [...draft.reserviceReasons, reason],
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
                  <div className="rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <FindingPart title="Lecture rapide" text={finding.reading} />
                  </div>
                  <div className="rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
                    <FindingPart
                      title="Pour l’instant"
                      text={INITIAL_OBSERVATION_MEAL_MESSAGE}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-5 rounded-[22px] bg-[var(--pc-color-surface-subtle)] p-4 shadow-[var(--pc-shadow-level-1)]">
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

function MealTunnelButton({
  children,
  onClick,
  variant = "ink",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "ink" | "line";
}) {
  const classes =
    variant === "ink"
      ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-hover)]"
      : "border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-muted)]";

  return (
    <button
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99] ${classes}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TunnelQuestion({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
        {title}
      </h1>
      {children}
    </section>
  );
}

function QuantityFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MealQuantityDraft;
  onChange: (value: MealQuantityDraft) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className={annotationClass}>{label}</p>
      <div className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] gap-2">
        <input
          className={inputClass}
          inputMode="decimal"
          value={value.amount}
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
          placeholder="1"
        />
        <select
          className={inputClass}
          value={value.unit}
          onChange={(event) =>
            onChange({
              ...value,
              unit: event.target.value as MealQuantityUnit,
            })
          }
        >
          {quickQuantityUnits.map((unit) => (
            <option key={unit} value={unit}>
              {quantityUnitLabels[unit]}
            </option>
          ))}
        </select>
      </div>
      {value.unit === "other" || value.unit === "unknown" ? (
        <input
          className={inputClass}
          value={value.note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder="Précise si tu veux"
        />
      ) : null}
    </div>
  );
}

function TunnelChoiceLine<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onPick: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`min-h-12 cursor-pointer rounded-[18px] border px-4 text-left text-base transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px active:scale-[0.99] ${
              selected
                ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onPick(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}

function ClarificationQuestion({
  clarification,
  onChange,
}: {
  clarification: MealClarification;
  onChange: (clarification: MealClarification) => void;
}) {
  const choices = getClarificationChoices(clarification.key);

  return (
    <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-3 shadow-[var(--pc-shadow-level-1)]">
      <p className="mb-3 text-sm font-semibold text-[var(--pc-color-text)]">
        {clarification.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const selected = clarification.value === choice;

          return (
            <button
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                selected
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)]"
              }`}
              key={choice}
              type="button"
              onClick={() =>
                onChange({
                  ...clarification,
                  value: choice,
                  customText:
                    choice === "Autre" ? clarification.customText ?? "" : null,
                })
              }
            >
              {choice}
            </button>
          );
        })}
      </div>
      {clarification.value === "Autre" ? (
        <input
          className={`${inputClass} mt-3`}
          value={clarification.customText ?? ""}
          onChange={(event) =>
            onChange({ ...clarification, customText: event.target.value })
          }
          placeholder="Précise en quelques mots"
        />
      ) : null}
    </div>
  );
}

function FindingPart({
  title,
  text,
  emphasized = false,
}: {
  title: string;
  text: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className={annotationClass}>{title}</p>
      <p
        className={
          emphasized
            ? "mt-2 font-serif text-3xl leading-tight text-[var(--pc-color-text)]"
            : "mt-2 leading-7 text-[var(--pc-color-text)]"
        }
      >
        {text}
      </p>
    </div>
  );
}
