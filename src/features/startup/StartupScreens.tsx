"use client";

import { Download } from "lucide-react";
import { StartupStateLayout } from "@/components/centenaire/StartupStateLayout";
import { Button, ErrorState, Surface } from "@/components/ui";

export function LoadingScreen() {
  return (
    <StartupStateLayout title="Ouverture du carnet.">
      <div
        aria-label="Ouverture du carnet"
        className="h-1.5 w-24 overflow-hidden rounded-[var(--pc-radius-full)] bg-[var(--pc-color-border)]"
        role="status"
      >
        <span className="block h-full w-1/2 animate-pulse rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary)]" />
      </div>
    </StartupStateLayout>
  );
}

export function ConnectedResetScreen({ failed }: { failed: boolean }) {
  return (
    <StartupStateLayout
      description={
        failed
          ? "Le cloud n’a pas pu être rechargé. Les anciennes données locales ne sont plus affichées."
          : undefined
      }
      title={failed ? "Reconnexion nécessaire." : "Réinitialisation locale."}
    >
      {failed ? (
        <Button onClick={() => window.location.reload()} variant="secondary">
          Recharger le carnet
        </Button>
      ) : (
        <div
          aria-label="Réinitialisation locale"
          className="h-1.5 w-24 overflow-hidden rounded-[var(--pc-radius-full)] bg-[var(--pc-color-border)]"
          role="status"
        >
          <span className="block h-full w-1/2 animate-pulse rounded-[var(--pc-radius-full)] bg-[var(--pc-color-primary)]" />
        </div>
      )}
    </StartupStateLayout>
  );
}

export type MigrationDecisionScreenProps = {
  busy: boolean;
  cloudEmail: string | null;
  cloudHasProfile: boolean;
  error: string | null;
  localHasProfile: boolean;
  operationStarted: boolean;
  onAttach: () => void;
  onExport: () => void;
  onKeepCloud: () => void;
};

export function MigrationDecisionScreen({
  busy,
  cloudEmail,
  cloudHasProfile,
  error,
  localHasProfile,
  onAttach,
  onExport,
  onKeepCloud,
  operationStarted,
}: MigrationDecisionScreenProps) {
  return (
    <StartupStateLayout
      eyebrow="Association des données"
      title="Des données existent sur cet appareil."
    >
      <Surface as="section" className="space-y-4 p-4 min-[390px]:p-5">
        <p className="text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text-muted)]">
          {operationStarted
            ? "L’association a déjà commencé. Termine-la avec la même opération pour conserver un état cohérent."
            : `Connecté avec ${cloudEmail ?? "ce compte"}. Choisis leur destination avant d’ouvrir le carnet.`}
        </p>
        {cloudHasProfile && localHasProfile ? (
          <p className="rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] px-4 py-3 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-primary)]">
            Le profil et les préférences du compte seront conservés. Les notes,
            mesures et événements locaux seront ajoutés sans effacer ceux du
            compte.
          </p>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <div className="grid gap-2">
          <Button disabled={busy} fullWidth onClick={onAttach}>
            {busy
              ? "Association en cours…"
              : operationStarted
                ? "Terminer l’association"
                : "Associer ces données à mon compte"}
          </Button>
          {!operationStarted ? (
            <Button
              disabled={busy}
              fullWidth
              onClick={onKeepCloud}
              variant="secondary"
            >
              Garder uniquement les données du compte
            </Button>
          ) : null}
          <Button
            disabled={busy}
            fullWidth
            onClick={onExport}
            variant="tertiary"
          >
            <Download aria-hidden="true" size={17} />
            Exporter les données de cet appareil
          </Button>
        </div>
      </Surface>
    </StartupStateLayout>
  );
}
