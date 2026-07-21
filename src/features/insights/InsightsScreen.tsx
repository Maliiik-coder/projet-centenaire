"use client";

import type { calculateWeeklyAnalysis } from "@/lib/analytics";
import type { AppData } from "@/lib/types";
import { WeightTrendChart } from "@/components/WeightTrendChart";

const sectionClass =
  "pc-halo-surface rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]";
const annotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";

export type InsightsScreenProps = {
  analysis: ReturnType<typeof calculateWeeklyAnalysis>;
  formatKg: (value: number | null | undefined) => string;
  smokingEnabled: boolean;
  weights: AppData["weights"];
};

export function InsightsScreen({
  analysis,
  formatKg,
  smokingEnabled,
  weights,
}: InsightsScreenProps) {
  const hasEnoughMealData = analysis.mealCount >= 5;

  return (
    <div className="space-y-5">
      <header className="space-y-3 pb-5">
        <p className={annotationClass}>Constats</p>
        <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
          Bilan de semaine
        </h1>
        <p className="text-base leading-7 text-[var(--pc-color-text)]">
          Les faits sont lus par domaine, sans mélanger les signaux.
        </p>
      </header>

      <section className={sectionClass}>
        <p className={annotationClass}>Alimentation</p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <InsightFact label="Repas observés" value={analysis.mealCount} />
          {hasEnoughMealData ? (
            <>
              <InsightFact label="Une assiette" value={analysis.onePlateMeals} />
              <InsightFact
                label="Deux assiettes ou plus"
                value={analysis.multiPlateMeals}
              />
              <InsightFact
                label="Sans faim"
                value={analysis.mealsStartedWithoutHunger}
              />
              <InsightFact
                label="Trop plein"
                value={analysis.mealsEndedTooFull}
              />
              <InsightFact
                label="Grignotages sans faim"
                value={analysis.snackingWithoutHunger}
              />
            </>
          ) : null}
        </dl>
        {!hasEnoughMealData ? (
          <p className="mt-5 leading-7 text-[var(--pc-color-text)]">
            Données insuffisantes pour établir un point de friction fiable.
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className={annotationClass}>Point de friction</p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--pc-color-text)]">
                {analysis.frictionPoint}
              </h2>
              <p className="mt-3 leading-7 text-[var(--pc-color-text)]">
                {analysis.priority.rationale}
              </p>
            </div>
            <div>
              <p className={annotationClass}>Priorité active</p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--pc-color-text)]">
                {analysis.priority.label}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
                Niveau de preuve : {analysis.priority.evidenceLevel}
              </p>
              <p className="mt-4 rounded-[18px] bg-[var(--pc-color-primary-soft)] px-4 py-3 leading-7 text-[var(--pc-color-primary)]">
                {analysis.priority.action}
              </p>
            </div>
          </div>
        )}
      </section>

      {smokingEnabled ? (
        <section className={sectionClass}>
          <p className={annotationClass}>Tabac</p>
          {analysis.smokingEntries === 0 ? (
            <p className="mt-3 leading-7 text-[var(--pc-color-text)]">
              Aucune donnée tabac renseignée cette semaine.
            </p>
          ) : (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <InsightFact
                  label="Données tabac"
                  value={analysis.smokingEntries}
                />
                <InsightFact
                  label="Jours sans cigarette renseignés"
                  value={analysis.smokeFreeDays}
                />
              </dl>
              <p className="mt-5 leading-7 text-[var(--pc-color-text)]">
                Les jours non renseignés restent neutres : absence de donnée ne
                signifie pas échec.
              </p>
            </>
          )}
        </section>
      ) : null}

      <section className={sectionClass}>
        <p className={annotationClass}>Poids</p>
        <p className="mt-2 text-sm text-[var(--pc-color-text-muted)]">
          Moyenne hebdomadaire :{" "}
          {analysis.weightAverageKg === null
            ? "Données insuffisantes"
            : formatKg(analysis.weightAverageKg)}
        </p>
        <div className="mt-4">
          <WeightTrendChart weights={weights} />
        </div>
      </section>
    </div>
  );
}

function InsightFact({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] bg-[var(--pc-color-surface-subtle)] p-3">
      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--pc-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-2xl tabular-nums text-[var(--pc-color-text)]">
        {value}
      </dd>
    </div>
  );
}
