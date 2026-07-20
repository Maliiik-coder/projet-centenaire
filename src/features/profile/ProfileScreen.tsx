"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Cloud,
  LogOut,
  PencilLine,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { behaviorHypothesisText } from "@/lib/onboarding";
import type { AppData, Profile } from "@/lib/types";
import { Button, Switch, buttonClassName } from "@/components/ui";
import { ProfileAdvancedOptions } from "@/features/profile/ProfileAdvancedOptions";
import { ProfileEditor } from "@/features/profile/ProfileEditor";
import {
  profileSmokingGoalLabels,
  profileSmokingStatusLabels,
} from "@/features/profile/profileModel";

export type ProfileScreenProps = {
  cloudEmail: string | null;
  cloudUserId: string | null;
  currentDate: string;
  data: AppData;
  editorOpen: boolean;
  formatKg: (value: number | null | undefined) => string;
  profile: Profile;
  profileDraft: Profile | null;
  onChangeDraft: (profile: Profile) => void;
  onChangeEditorOpen: (open: boolean) => void;
  onImportFile: (file: File) => Promise<void>;
  onOpenBehaviorEditor: () => void;
  onPreferencesChange: (
    preferences: Partial<Pick<Profile, "darkMode" | "showActiveMission">>,
  ) => void;
  onResetData: () => Promise<void>;
  onSaveProfile: (profile: Profile) => void;
  onSignOut: () => Promise<void>;
  onValidationError: (message: string) => void;
};

export function ProfileScreen({
  cloudEmail,
  cloudUserId,
  currentDate,
  data,
  editorOpen,
  formatKg,
  profile,
  profileDraft,
  onChangeDraft,
  onChangeEditorOpen,
  onImportFile,
  onOpenBehaviorEditor,
  onPreferencesChange,
  onResetData,
  onSaveProfile,
  onSignOut,
  onValidationError,
}: ProfileScreenProps) {
  const behaviorAssessment = profile.initialBehaviorAssessment;
  const smokingSummaryText = profile.smokingGoal
    ? `${profileSmokingStatusLabels[profile.smokingStatus]} · ${profileSmokingGoalLabels[profile.smokingGoal]}`
    : profileSmokingStatusLabels[profile.smokingStatus];

  return (
    <div className="space-y-8">
      <header className="space-y-2 pb-1">
        <p className={eyebrowClass}>Profil</p>
        <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
          Ton espace
        </h1>
        <p className="text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
          Tes informations, tes repères et ton compte.
        </p>
      </header>

      <ProfileSection
        action={
          <Button
            aria-expanded={editorOpen}
            className="shrink-0"
            variant={editorOpen ? "tertiary" : "secondary"}
            onClick={() => onChangeEditorOpen(!editorOpen)}
          >
            <PencilLine aria-hidden="true" size={17} />
            {editorOpen ? "Fermer" : "Modifier"}
          </Button>
        }
        eyebrow="Résumé personnel"
        icon={<UserRound aria-hidden="true" size={21} />}
        title={profile.firstName || "Mon profil"}
      >
        {editorOpen && profileDraft ? (
          <ProfileEditor
            draft={profileDraft}
            profile={profile}
            onCancel={() => onChangeEditorOpen(false)}
            onChange={onChangeDraft}
            onSave={onSaveProfile}
            onValidationError={onValidationError}
          />
        ) : (
          <div className="mt-4">
            <p className="text-[length:var(--pc-font-size-secondary)] text-[var(--pc-color-text-muted)]">
              {profile.age} ans · {profile.heightCm} cm
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <ProfileMetric
                label="Poids de départ"
                value={formatKg(profile.startWeightKg)}
              />
              <ProfileMetric
                label="Objectif"
                value={formatKg(profile.goalWeightKg)}
              />
            </dl>
            <div className="mt-4 flex items-start justify-between gap-4 border-t border-[var(--pc-color-border)] pt-4">
              <span className="text-[length:var(--pc-font-size-secondary)] font-medium text-[var(--pc-color-text)]">
                Tabac
              </span>
              <span className="max-w-[62%] text-right text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
                {smokingSummaryText}
              </span>
            </div>
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        action={
          <Button className="shrink-0" variant="secondary" onClick={onOpenBehaviorEditor}>
            {behaviorAssessment ? "Revoir" : "Compléter"}
          </Button>
        }
        eyebrow="Portrait initial"
        icon={<ShieldCheck aria-hidden="true" size={21} />}
        title="Tes pistes à observer"
      >
        {behaviorAssessment?.hypotheses.length ? (
          <ul className="mt-4 space-y-3">
            {behaviorAssessment.hypotheses.map((hypothesis) => (
              <li
                className="flex gap-3 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text-muted)]"
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
          <p className="mt-4 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text-muted)]">
            {behaviorAssessment
              ? "Aucune tendance nette ne ressort pour le moment."
              : "Ce portrait aide Haru à choisir les premières situations à observer."}
          </p>
        )}
        <p className="mt-3 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
          Réponses déclarées et modifiables. Ce n’est pas un diagnostic.
        </p>
      </ProfileSection>

      <section aria-labelledby="profile-preferences-title">
        <p className={eyebrowClass}>Préférences</p>
        <h2
          className="mt-1 text-[length:var(--pc-font-size-section-title)] font-bold text-[var(--pc-color-text)]"
          id="profile-preferences-title"
        >
          Affichage
        </h2>
        <div className="mt-3 divide-y divide-[var(--pc-color-border)]">
          <Switch
            checked={profile.darkMode}
            description="Une interface plus douce dans un environnement sombre."
            label="Mode sombre"
            onCheckedChange={(darkMode) =>
              onPreferencesChange({ darkMode })
            }
          />
          <Switch
            checked={profile.showActiveMission}
            className="pt-3"
            description="Montre le bloc d’observation sur la page Aujourd’hui."
            label="Afficher le repère du jour"
            onCheckedChange={(showActiveMission) =>
              onPreferencesChange({ showActiveMission })
            }
          />
        </div>
      </section>

      <section aria-labelledby="profile-account-title">
        <p className={eyebrowClass}>Compte</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
            {cloudUserId ? (
              <Cloud aria-hidden="true" size={20} />
            ) : (
              <Smartphone aria-hidden="true" size={20} />
            )}
          </span>
          <div className="min-w-0">
            <h2
              className="text-[length:var(--pc-font-size-card-title)] font-bold text-[var(--pc-color-text)]"
              id="profile-account-title"
            >
              {cloudUserId ? "Compte connecté" : "Carnet local"}
            </h2>
            <p className="mt-1 break-words text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
              {cloudUserId
                ? cloudEmail ?? "Compte cloud actif"
                : "Les données restent sur cet appareil."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {cloudUserId ? (
            <>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => void onSignOut()}
              >
                <LogOut aria-hidden="true" size={18} />
                Se déconnecter
              </Button>
              <Link
                className={buttonClassName({
                  variant: "danger",
                  fullWidth: true,
                })}
                href="/account"
              >
                Supprimer mon compte
              </Link>
            </>
          ) : (
            <Link
              className={buttonClassName({
                variant: "secondary",
                fullWidth: true,
              })}
              href="/login"
            >
              Se connecter
            </Link>
          )}
        </div>
      </section>

      <ProfileAdvancedOptions
        currentDate={currentDate}
        data={data}
        onImportFile={onImportFile}
        onResetData={onResetData}
      />
    </div>
  );
}

function ProfileSection({
  action,
  children,
  eyebrow,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-[var(--pc-color-border)] pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
            {icon}
          </span>
          <div className="min-w-0">
            <p className={eyebrowClass}>{eyebrow}</p>
            <h2 className="mt-1 text-[length:var(--pc-font-size-card-title)] font-bold text-[var(--pc-color-text)]">
              {title}
            </h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] p-3">
      <dt className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[length:var(--pc-font-size-body)] font-bold text-[var(--pc-color-text)]">
        {value}
      </dd>
    </div>
  );
}

const eyebrowClass =
  "text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]";
