"use client";

import { useRef, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Download, RefreshCw, Upload } from "lucide-react";
import { behaviorHypothesisText } from "@/lib/onboarding";
import type { AppData, Profile } from "@/lib/types";
import { Button as UIButton } from "@/components/ui";
import {
  isValidEditableProfile,
  profileNeedsSmokingGoal,
  profileSmokingGoalLabels,
  profileSmokingStatusLabels,
} from "@/features/profile/profileModel";

const sectionClass =
  "rounded-[22px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] p-4 shadow-[var(--pc-shadow-level-1)]";
const annotationClass =
  "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pc-color-text-muted)]";
const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-base text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] outline-none placeholder:text-[var(--pc-color-text-muted)] focus:border-[var(--pc-color-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pc-color-focus)_20%,transparent)]";

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
  const importInputRef = useRef<HTMLInputElement>(null);
  const smokingSummaryText = profile.smokingGoal
    ? `${profileSmokingStatusLabels[profile.smokingStatus]} · ${profileSmokingGoalLabels[profile.smokingGoal]}`
    : profileSmokingStatusLabels[profile.smokingStatus];
  const behaviorAssessment = profile.initialBehaviorAssessment;

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileDraft || !isValidEditableProfile(profileDraft)) {
      onValidationError("Vérifie les données du profil.");
      return;
    }

    onSaveProfile(profileDraft);
  };

  return (
    <div className="space-y-5">
      <header className="space-y-3 pb-5">
        <p className={annotationClass}>Profil</p>
        <h1 className="font-serif text-3xl leading-tight text-[var(--pc-color-text)]">
          Paramètres
        </h1>
        <p className="text-base leading-7 text-[var(--pc-color-text)]">
          Les réglages essentiels, le compte et les options avancées.
        </p>
      </header>

      {profileDraft ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <p className={annotationClass}>Profil</p>
            <button
              className="rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--pc-color-primary)] transition active:scale-[0.98]"
              type="button"
              onClick={() => onChangeEditorOpen(!editorOpen)}
            >
              {editorOpen ? "Fermer" : "Modifier"}
            </button>
          </div>
          <button
            className="mt-4 grid w-full gap-3 rounded-[20px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 text-left shadow-[var(--pc-shadow-level-1)] transition active:scale-[0.99]"
            type="button"
            onClick={() => onChangeEditorOpen(true)}
          >
            <div>
              <p className="font-serif text-2xl leading-tight text-[var(--pc-color-text)]">
                {profile.firstName || "Profil"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--pc-color-text-muted)]">
                {profile.age} ans · {profile.heightCm} cm
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-[var(--pc-color-text)]">
              <span>Départ · {formatKg(profile.startWeightKg)}</span>
              <span>Objectif · {formatKg(profile.goalWeightKg)}</span>
              <span className="col-span-2">Tabac · {smokingSummaryText}</span>
            </div>
          </button>

          {editorOpen ? (
            <form className="mt-5 grid gap-4" onSubmit={submitProfile}>
              <ProfileTextInput
                label="Prénom"
                value={profileDraft.firstName}
                onChange={(value) =>
                  onChangeDraft({ ...profileDraft, firstName: value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <ProfileNumberInput
                  label="Âge"
                  value={profileDraft.age}
                  onChange={(value) =>
                    onChangeDraft({ ...profileDraft, age: value })
                  }
                />
                <ProfileNumberInput
                  label="Taille en cm"
                  value={profileDraft.heightCm}
                  onChange={(value) =>
                    onChangeDraft({ ...profileDraft, heightCm: value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProfileNumberInput
                  label="Poids de départ"
                  value={profileDraft.startWeightKg}
                  onChange={(value) =>
                    onChangeDraft({ ...profileDraft, startWeightKg: value })
                  }
                />
                <ProfileNumberInput
                  label="Poids objectif"
                  value={profileDraft.goalWeightKg}
                  onChange={(value) =>
                    onChangeDraft({ ...profileDraft, goalWeightKg: value })
                  }
                />
              </div>
              <ProfileChoiceLine
                options={profileSmokingStatusLabels}
                value={profileDraft.smokingStatus}
                onChange={(value) =>
                  onChangeDraft({
                    ...profileDraft,
                    smokingStatus: value,
                    smokingGoal: profileNeedsSmokingGoal(value)
                      ? profileDraft.smokingGoal ?? "observer"
                      : undefined,
                  })
                }
              />
              {profileNeedsSmokingGoal(profileDraft.smokingStatus) ? (
                <ProfileChoiceLine
                  options={profileSmokingGoalLabels}
                  value={profileDraft.smokingGoal ?? "observer"}
                  onChange={(value) =>
                    onChangeDraft({ ...profileDraft, smokingGoal: value })
                  }
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <ProfileActionButton type="submit">Enregistrer</ProfileActionButton>
                <ProfileActionButton
                  variant="line"
                  onClick={() => {
                    onChangeDraft(profile);
                    onChangeEditorOpen(false);
                  }}
                >
                  Annuler
                </ProfileActionButton>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={annotationClass}>Portrait initial</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--pc-color-text)]">
              Tes pistes à observer
            </h2>
          </div>
          <UIButton className="shrink-0" variant="secondary" onClick={onOpenBehaviorEditor}>
            {behaviorAssessment ? "Revoir" : "Compléter"}
          </UIButton>
        </div>
        {behaviorAssessment?.hypotheses.length ? (
          <ul className="mt-4 space-y-3">
            {behaviorAssessment.hypotheses.map((hypothesis) => (
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
          <p className="mt-4 text-sm leading-6 text-[var(--pc-color-text-muted)]">
            {behaviorAssessment
              ? "Aucune tendance nette ne ressort pour le moment."
              : "Ce portrait aide Haru à choisir les premières situations à observer."}
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--pc-color-text-muted)]">
          Réponses déclarées, modifiables à tout moment. Ce n’est pas un diagnostic.
        </p>
      </section>

      <section className={sectionClass}>
        <p className={annotationClass}>Préférences</p>
        <div className="mt-4 grid gap-3">
          <ProfileSwitch
            checked={profile.darkMode}
            label="Mode sombre"
            onChange={(checked) => onPreferencesChange({ darkMode: checked })}
          />
          <ProfileSwitch
            checked={profile.showActiveMission}
            label="Afficher la mission en cours"
            onChange={(checked) =>
              onPreferencesChange({ showActiveMission: checked })
            }
          />
        </div>
      </section>

      <section className={sectionClass}>
        <p className={annotationClass}>Compte</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--pc-color-text)]">
              {cloudUserId ? "Connecté" : "Non connecté"}
            </p>
            <p className="mt-1 break-words text-sm text-[var(--pc-color-text-muted)]">
              {cloudUserId
                ? cloudEmail ?? "Compte cloud actif"
                : "Le carnet fonctionne en local sur cet appareil."}
            </p>
          </div>
          {cloudUserId ? (
            <div className="grid gap-2">
              <ProfileActionButton variant="line" onClick={() => void onSignOut()}>
                Se déconnecter
              </ProfileActionButton>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D7B8B2] bg-[#FFF7F3] px-5 text-sm font-semibold text-[#8A3B32] transition active:scale-[0.99]"
                href="/account"
              >
                Supprimer mon compte
              </Link>
            </div>
          ) : (
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] px-5 text-sm font-semibold text-[var(--pc-color-primary)] shadow-[var(--pc-shadow-level-1)] transition active:scale-[0.99]"
              href="/login"
            >
              Se connecter
            </Link>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <p className={annotationClass}>Options avancées</p>
        <details className="mt-4 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--pc-color-text)]">
            Export, import et réinitialisation
          </summary>
          <div className="mt-4 grid gap-2">
            <ProfileActionButton
              variant="line"
              onClick={() => exportProfileData(data, currentDate)}
            >
              <Download aria-hidden="true" size={17} />
              Export JSON
            </ProfileActionButton>
            <ProfileActionButton
              variant="line"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload aria-hidden="true" size={17} />
              Import JSON
            </ProfileActionButton>
            <input
              ref={importInputRef}
              accept="application/json"
              className="hidden"
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                try {
                  await onImportFile(file);
                } finally {
                  event.target.value = "";
                }
              }}
            />
            <ProfileActionButton
              variant="signal"
              onClick={() => {
                if (window.confirm("Réinitialiser les données locales de cet appareil ?")) {
                  void onResetData();
                }
              }}
            >
              <RefreshCw aria-hidden="true" size={17} />
              Réinitialiser données locales
            </ProfileActionButton>
          </div>
        </details>
      </section>
    </div>
  );
}

function exportProfileData(payload: AppData, date: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `projet-centenaire-carnet-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function ProfileActionButton({
  children,
  onClick,
  type = "button",
  variant = "ink",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "ink" | "line" | "signal";
}) {
  const classes =
    variant === "ink"
      ? "bg-[var(--pc-color-primary)] text-[var(--pc-color-on-primary)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-hover)]"
      : variant === "signal"
        ? "border border-[#D7B8B2] bg-[#FFF7F3] text-[#8A3B32]"
        : "border border-[var(--pc-color-primary-muted)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)] hover:bg-[var(--pc-color-primary-muted)]";

  return (
    <button
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_55%,transparent)] active:translate-y-px active:scale-[0.99] ${classes}`}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ProfileChoiceLine<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Partial<Record<T, string>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([key, label]) => {
        const selected = key === value;

        return (
          <button
            className={`min-h-12 cursor-pointer rounded-[16px] border px-4 text-left text-sm transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pc-color-focus)_35%,transparent)] active:translate-y-px ${
              selected
                ? "border-[var(--pc-color-primary)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
                : "border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] text-[var(--pc-color-text)] shadow-[var(--pc-shadow-level-1)]"
            }`}
            key={key}
            type="button"
            onClick={() => onChange(key as T)}
          >
            {label as string}
          </button>
        );
      })}
    </div>
  );
}

function ProfileSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)] px-4 py-3 text-left transition active:scale-[0.99]"
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span className="text-sm font-semibold text-[var(--pc-color-text)]">{label}</span>
      <span
        className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
          checked
            ? "justify-end bg-[var(--pc-color-primary)]"
            : "justify-start bg-[var(--pc-color-primary-muted)]"
        }`}
      >
        <span className="size-6 rounded-full bg-white shadow-[0_2px_8px_rgba(16,24,32,0.18)]" />
      </span>
    </button>
  );
}

function ProfileTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm text-[var(--pc-color-text)]">
      <span>{label}</span>
      <input
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProfileNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm text-[var(--pc-color-text)]">
      <span>{label}</span>
      <input
        className={inputClass}
        inputMode="decimal"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
