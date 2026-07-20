"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, Surface } from "@/components/ui";
import { cx } from "@/components/ui/styles";
import { ExerciseGuideBlock } from "@/features/sport/ExerciseGuideMedia";
import {
  STRENGTH_EXERCISES,
} from "@/lib/sport/exerciseLibrary";
import {
  activeSportLimitationZones,
  defaultExerciseCatalogFilters,
  getExerciseCatalogDetail,
  getVariantNavigation,
  hasNoEquipmentVariant,
  listExerciseCatalogEntries,
  movementPatternLabels,
  type ExerciseCatalogIntentionFilter,
  type ExerciseCatalogLevelFilter,
  type ExerciseCatalogZoneFilter,
} from "@/lib/sport/exerciseCatalog";
import type {
  BodyZone,
  ExerciseVariant,
  SportLocalData,
} from "@/lib/sport/types";

const zoneLabels: Record<BodyZone, string> = {
  shoulders: "Epaules",
  back: "Dos",
  knees: "Genoux",
  hips: "Hanches",
  wrists: "Poignets",
  ankles: "Chevilles",
  other: "Autre",
};

const catalogZoneChoices: Array<ExerciseCatalogZoneFilter> = [
  "all",
  "shoulders",
  "back",
  "knees",
  "hips",
  "wrists",
  "ankles",
  "other",
];
const catalogIntentionChoices: Array<ExerciseCatalogIntentionFilter> = [
  "all",
  "mobility",
  "squat",
  "push",
  "hinge",
  "bridge",
  "core",
  "pull",
  "locomotion",
];
const catalogLevelChoices: Array<ExerciseCatalogLevelFilter> = [
  "all",
  0,
  1,
  2,
  3,
  4,
];

function catalogLevelLabel(level: ExerciseCatalogLevelFilter): string {
  return level === "all" ? "Tous niveaux" : `Niveau ${level + 1}`;
}

function catalogZoneLabel(zone: ExerciseCatalogZoneFilter): string {
  return zone === "all" ? "Toutes zones" : zoneLabels[zone];
}

function catalogIntentionLabel(
  intention: ExerciseCatalogIntentionFilter,
): string {
  return intention === "all"
    ? "Toutes intentions"
    : movementPatternLabels[intention];
}

function equipmentLabel(
  requiredEquipment: ExerciseVariant["requiredEquipment"],
): string {
  if (requiredEquipment.length === 0) {
    return "Aucun materiel";
  }

  const labels: Record<ExerciseVariant["requiredEquipment"][number], string> = {
    dumbbells: "Halteres",
    fins: "Palmes",
    gym_equipment: "Materiel de salle",
    kickboard: "Planche",
    mat: "Tapis",
    none: "Aucun materiel",
    pull_buoy: "Pull buoy",
    pull_up_bar: "Barre",
    resistance_band: "Elastique",
    stable_chair: "Chaise stable",
  };

  return requiredEquipment.map((item) => labels[item]).join(", ");
}

function zoneListLabel(zones: BodyZone[]): string {
  return zones.map((zone) => zoneLabels[zone]).join(", ");
}

export function ExerciseLibraryView({ data }: { data: SportLocalData }) {
  const [zone, setZone] = useState<ExerciseCatalogZoneFilter>(
    defaultExerciseCatalogFilters.zone,
  );
  const [intention, setIntention] =
    useState<ExerciseCatalogIntentionFilter>(
      defaultExerciseCatalogFilters.intention,
    );
  const [level, setLevel] = useState<ExerciseCatalogLevelFilter>(
    defaultExerciseCatalogFilters.level,
  );
  const [noEquipmentOnly, setNoEquipmentOnly] = useState(
    defaultExerciseCatalogFilters.noEquipmentOnly,
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const activeLimitationZones = activeSportLimitationZones(data.limitations);
  const entries = listExerciseCatalogEntries({
    activeLimitationZones,
    intention,
    level,
    noEquipmentOnly,
    zone,
  });
  const selectedDetail = selectedExerciseId
    ? getExerciseCatalogDetail(selectedExerciseId)
    : null;

  if (selectedDetail) {
    return (
      <ExerciseDetailView
        detail={selectedDetail}
        onBack={() => setSelectedExerciseId(null)}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <Surface className="grid gap-2 p-4" variant="selected">
        <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
          Bibliotheque
        </p>
        <h2 className="text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
          Exercices de renforcement musculaire
        </h2>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {STRENGTH_EXERCISES.length} familles, filtrees selon les zones
          sensibles connues.
        </p>
      </Surface>

      <Surface className="grid gap-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CatalogSelect
            label="Zone"
            value={zone}
            options={catalogZoneChoices.map((choice) => ({
              label: catalogZoneLabel(choice),
              value: String(choice),
            }))}
            onChange={(value) => setZone(value as ExerciseCatalogZoneFilter)}
          />
          <CatalogSelect
            label="Intention"
            value={intention}
            options={catalogIntentionChoices.map((choice) => ({
              label: catalogIntentionLabel(choice),
              value: String(choice),
            }))}
            onChange={(value) =>
              setIntention(value as ExerciseCatalogIntentionFilter)
            }
          />
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
            Niveau
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {catalogLevelChoices.map((choice) => (
              <button
                className={cx(
                  "pc-focus-ring min-h-10 rounded-[var(--pc-radius-control)] border px-2 text-sm font-semibold",
                  level === choice
                    ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
                    : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]",
                )}
                key={choice}
                type="button"
                onClick={() => setLevel(choice)}
              >
                {choice === "all" ? "Tous" : choice + 1}
              </button>
            ))}
          </div>
        </div>
        <button
          aria-pressed={noEquipmentOnly}
          className={cx(
            "pc-focus-ring flex min-h-12 items-center justify-between gap-3 rounded-[var(--pc-radius-card)] border px-3 py-2 text-left",
            noEquipmentOnly
              ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
              : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)]",
          )}
          type="button"
          onClick={() => setNoEquipmentOnly((current) => !current)}
        >
          <span className="font-semibold">Sans materiel uniquement</span>
          <span className="text-sm font-semibold">
            {noEquipmentOnly ? "Oui" : "Non"}
          </span>
        </button>
      </Surface>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
            Mouvements
          </h3>
          <span className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--pc-color-primary)]">
            {entries.length}
          </span>
        </div>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <ExerciseCatalogCard
              entry={entry}
              key={entry.exercise.id}
              onOpen={() => setSelectedExerciseId(entry.exercise.id)}
            />
          ))
        ) : (
          <Surface className="p-4" variant="subtle">
            <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
              Aucun mouvement ne correspond a ces filtres.
            </p>
          </Surface>
        )}
      </section>
    </section>
  );
}

function CatalogSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--pc-color-text-muted)]">
        {label}
      </span>
      <select
        className="pc-focus-ring min-h-12 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-3 text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-text)]"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ExerciseCatalogCard({
  entry,
  onOpen,
}: {
  entry: ReturnType<typeof listExerciseCatalogEntries>[number];
  onOpen: () => void;
}) {
  const noEquipment = hasNoEquipmentVariant(entry.exercise);

  return (
    <button className="pc-focus-ring text-left" type="button" onClick={onOpen}>
      <Surface className="grid gap-3 p-4" variant="interactive">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-[var(--pc-color-text)]">
              {entry.exercise.name}
            </h4>
            <p className="mt-1 text-sm leading-5 text-[var(--pc-color-text-muted)]">
              {entry.exercise.shortDescription}
            </p>
          </div>
          <span className="shrink-0 rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--pc-color-text-muted)]">
            {entry.matchingVariantIds.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CatalogPill>
            {movementPatternLabels[entry.exercise.movementPattern]}
          </CatalogPill>
          <CatalogPill>{zoneListLabel(entry.exercise.targetZones)}</CatalogPill>
          <CatalogPill>
            {noEquipment ? "Sans materiel" : "Materiel selon variante"}
          </CatalogPill>
        </div>
      </Surface>
    </button>
  );
}

function ExerciseDetailView({
  detail,
  onBack,
}: {
  detail: NonNullable<ReturnType<typeof getExerciseCatalogDetail>>;
  onBack: () => void;
}) {
  const firstNoEquipmentVariant =
    detail.variants.find((variant) => variant.requiredEquipment.length === 0) ??
    detail.variants[0];
  const [variantId, setVariantId] = useState(firstNoEquipmentVariant?.id ?? "");
  const navigation = getVariantNavigation(detail, variantId);
  const currentVariant = navigation?.current ?? firstNoEquipmentVariant;

  return (
    <section className="grid gap-4">
      <Button className="w-fit min-h-10 px-3" variant="tertiary" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={16} />
        Exercices
      </Button>

      <Surface className="grid gap-3 p-4" variant="selected">
        <div>
          <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
            {movementPatternLabels[detail.exercise.movementPattern]}
          </p>
          <h2 className="mt-1 text-[length:var(--pc-font-size-section-title)] leading-7 font-semibold">
            {detail.exercise.name}
          </h2>
        </div>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {detail.exercise.shortDescription}
        </p>
        <div className="flex flex-wrap gap-2">
          <CatalogPill>
            Zones : {zoneListLabel(detail.exercise.targetZones)}
          </CatalogPill>
          <CatalogPill>
            Precautions : {zoneListLabel(detail.exercise.cautionZones)}
          </CatalogPill>
        </div>
      </Surface>

      {currentVariant ? (
        <Surface className="grid gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--pc-color-primary)]">
              Variante
            </p>
            <h3 className="mt-1 text-[length:var(--pc-font-size-card-title)] font-semibold">
              {currentVariant.name}
            </h3>
          </div>
          <ExerciseGuideBlock variant={currentVariant} />
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!navigation?.easier}
              variant="secondary"
              onClick={() =>
                navigation?.easier ? setVariantId(navigation.easier.id) : null
              }
            >
              Plus facile
            </Button>
            <Button
              disabled={!navigation?.harder}
              variant="secondary"
              onClick={() =>
                navigation?.harder ? setVariantId(navigation.harder.id) : null
              }
            >
              Plus difficile
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ExerciseFact
              label="Niveau"
              value={catalogLevelLabel(currentVariant.difficulty)}
            />
            <ExerciseFact
              label="Materiel"
              value={equipmentLabel(currentVariant.requiredEquipment)}
            />
          </div>
        </Surface>
      ) : null}

      <Surface className="grid gap-3 p-4">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Consignes
        </h3>
        <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {detail.exercise.primaryCue}
        </p>
        <ul className="grid gap-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {detail.exercise.teachingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <ExerciseFact label="Respiration" value={detail.exercise.breathing} />
      </Surface>

      <Surface className="grid gap-3 p-4" variant="subtle">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Points de vigilance
        </h3>
        <ul className="grid gap-2 text-sm leading-5 text-[var(--pc-color-text-muted)]">
          {detail.exercise.commonMistakes.map((mistake) => (
            <li key={mistake}>{mistake}</li>
          ))}
        </ul>
        <p className="text-sm leading-5 text-[var(--pc-color-warning)]">
          Si une zone indiquee devient sensible ou inconfortable, ne force pas
          le mouvement.
        </p>
      </Surface>

      <Surface className="grid gap-3 p-4">
        <h3 className="text-[length:var(--pc-font-size-card-title)] font-semibold">
          Variantes disponibles
        </h3>
        <div className="grid gap-2">
          {detail.variants.map((variant) => (
            <button
              className={cx(
                "pc-focus-ring min-h-12 rounded-[var(--pc-radius-card)] border px-3 py-2 text-left",
                variant.id === currentVariant?.id
                  ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)]"
                  : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]",
              )}
              key={variant.id}
              type="button"
              onClick={() => setVariantId(variant.id)}
            >
              <span className="block font-semibold">{variant.name}</span>
              <span className="mt-0.5 block text-sm text-[var(--pc-color-text-muted)]">
                {catalogLevelLabel(variant.difficulty)} -{" "}
                {equipmentLabel(variant.requiredEquipment)}
              </span>
            </button>
          ))}
        </div>
      </Surface>
    </section>
  );
}

function ExerciseFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface-subtle)] p-3">
      <p className="text-xs font-semibold uppercase text-[var(--pc-color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-[var(--pc-color-text)]">
        {value}
      </p>
    </div>
  );
}

function CatalogPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--pc-color-primary)]">
      {children}
    </span>
  );
}
