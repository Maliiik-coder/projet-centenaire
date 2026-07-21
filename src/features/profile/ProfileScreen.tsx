"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Cigarette,
  Cloud,
  Dumbbell,
  LogOut,
  PencilLine,
  Settings2,
  Smartphone,
  Target,
  UserRound,
  Utensils,
} from "lucide-react";
import { getLatestWeight } from "@/lib/analytics";
import { behaviorHypothesisText } from "@/lib/onboarding";
import type { AppData, Profile } from "@/lib/types";
import { Button, Switch, buttonClassName } from "@/components/ui";
import { ProfileAdvancedOptions } from "@/features/profile/ProfileAdvancedOptions";
import { ProfileEditor } from "@/features/profile/ProfileEditor";
import {
  profileNeedsSmokingGoal,
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
  onOpenSportProfile?: () => void;
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
  onOpenSportProfile,
  onPreferencesChange,
  onResetData,
  onSaveProfile,
  onSignOut,
  onValidationError,
}: ProfileScreenProps) {
  const behaviorAssessment = profile.initialBehaviorAssessment;
  const latestWeight = getLatestWeight(data.weights);
  const currentWeightText = latestWeight
    ? formatKg(latestWeight.weightKg)
    : "À compléter";
  const smokingSummaryText = profile.smokingGoal
    ? `${profileSmokingStatusLabels[profile.smokingStatus]} · ${profileSmokingGoalLabels[profile.smokingGoal]}`
    : profileSmokingStatusLabels[profile.smokingStatus];
  const showSmokingSummary = isSmokingRelevant(profile);

  return (
    <div className="space-y-7">
      <header className="space-y-5 pb-1">
        <p className={eyebrowClass}>Profil</p>
        <div className="space-y-2">
          <h1 className="text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
            {profile.firstName || "Ton espace"}
          </h1>
          <p className="max-w-[30rem] text-[length:var(--pc-font-size-body)] leading-6 text-[var(--pc-color-text-muted)]">
            Tes repères personnels, tes préférences et les accès utiles.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 border-y border-[var(--pc-color-border)] py-3">
          <ProfileStat label="Actuel" value={currentWeightText} />
          <ProfileStat label="Départ" value={formatKg(profile.startWeightKg)} />
          <ProfileStat label="Objectif" value={formatKg(profile.goalWeightKg)} />
        </dl>
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
        eyebrow="Profil général"
        icon={<UserRound aria-hidden="true" size={21} />}
        title="Tes informations"
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
          <div className="mt-4 space-y-4">
            <dl className="grid grid-cols-2 gap-3">
              <ProfileMetric
                label="Prénom"
                value={profile.firstName || "Non renseigné"}
              />
              <ProfileMetric label="Âge" value={`${profile.age} ans`} />
              <ProfileMetric label="Taille" value={`${profile.heightCm} cm`} />
              <ProfileMetric label="Poids actuel" value={currentWeightText} />
            </dl>
            <p className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
              Le poids actuel vient de la dernière mesure du Carnet. S’il manque,
              Haru l’indique sans extrapoler.
            </p>
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        action={
          <Button className="shrink-0" variant="secondary" onClick={onOpenBehaviorEditor}>
            {behaviorAssessment ? "Revoir" : "Compléter"}
          </Button>
        }
        eyebrow="Profil alimentaire"
        icon={<Utensils aria-hidden="true" size={21} />}
        title={
          behaviorAssessment?.hypotheses.length
            ? `${behaviorAssessment.hypotheses.length} piste${
                behaviorAssessment.hypotheses.length > 1 ? "s" : ""
              } à observer`
            : "Portrait à compléter"
        }
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

      <ProfileSportSection onOpenSportProfile={onOpenSportProfile} />

      {showSmokingSummary ? (
        <ProfileSection
          eyebrow="Tabac"
          icon={<Cigarette aria-hidden="true" size={21} />}
          title="Situation déclarée"
        >
          <div className="mt-4 rounded-[var(--pc-radius-control)] bg-[var(--pc-color-surface-subtle)] px-4 py-3">
            <p className="text-[length:var(--pc-font-size-body)] font-semibold text-[var(--pc-color-text)]">
              {smokingSummaryText}
            </p>
            <p className="mt-1 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
              Haru garde ce repère pour le suivi quotidien, sans conseil médical
              ni module dédié pour le moment.
            </p>
          </div>
        </ProfileSection>
      ) : null}

      <section
        aria-labelledby="profile-preferences-title"
        className="pc-halo-surface px-4 py-4"
      >
        <SectionHeading
          eyebrow="Préférences"
          icon={<Settings2 aria-hidden="true" size={21} />}
          title="Affichage"
          titleId="profile-preferences-title"
        />
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

      <section
        aria-labelledby="profile-account-title"
        className="pc-halo-surface px-4 py-4"
      >
        <SectionHeading
          eyebrow="Compte"
          icon={
            cloudUserId ? (
              <Cloud aria-hidden="true" size={21} />
            ) : (
              <Smartphone aria-hidden="true" size={21} />
            )
          }
          title={cloudUserId ? "Compte connecté" : "Carnet local"}
          titleId="profile-account-title"
        />
        <p className="mt-3 break-words text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text-muted)]">
          {cloudUserId
            ? cloudEmail ?? "Compte cloud actif"
            : "Les données restent sur cet appareil."}
        </p>

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

export function ProfileSportSection({
  onOpenSportProfile,
}: {
  onOpenSportProfile?: () => void;
}) {
  return (
    <ProfileSection
      action={
        <Button
          className="shrink-0"
          disabled={!onOpenSportProfile}
          variant="secondary"
          onClick={onOpenSportProfile}
        >
          <Target aria-hidden="true" size={17} />
          Compléter
        </Button>
      }
      eyebrow="Profil sportif"
      icon={<Dumbbell aria-hidden="true" size={21} />}
      title="À compléter"
    >
      <p className="mt-4 text-[length:var(--pc-font-size-secondary)] leading-6 text-[var(--pc-color-text-muted)]">
        Le module Sport pourra renseigner ton niveau, tes limites et tes objectifs
        de mouvement. Cette page ne lit pas ses données directement.
      </p>
    </ProfileSection>
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
    <section className="pc-halo-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading eyebrow={eyebrow} icon={icon} title={title} />
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  icon,
  title,
  titleId,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  titleId?: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={eyebrowClass}>{eyebrow}</p>
        <h2
          className="mt-1 text-[length:var(--pc-font-size-card-title)] leading-6 font-bold text-[var(--pc-color-text)]"
          id={titleId}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[length:var(--pc-font-size-secondary)] leading-5 font-bold text-[var(--pc-color-text)]">
        {value}
      </dd>
    </div>
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

function isSmokingRelevant(profile: Profile): boolean {
  return (
    profileNeedsSmokingGoal(profile.smokingStatus) ||
    profile.smokingStatus === "arrete"
  );
}

const eyebrowClass =
  "text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]";
