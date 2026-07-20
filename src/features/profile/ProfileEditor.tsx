"use client";

import { CircleAlert } from "lucide-react";
import type { FormEvent } from "react";
import { Button, FormField, Select, TextInput } from "@/components/ui";
import type { Profile } from "@/lib/types";
import {
  editableProfileLimits,
  getEditableProfileErrors,
  hasStartWeightChanged,
  normalizeEditableProfile,
  profileNeedsSmokingGoal,
  profileSmokingGoalLabels,
  profileSmokingStatusLabels,
} from "@/features/profile/profileModel";

type ProfileEditorProps = {
  draft: Profile;
  profile: Profile;
  onCancel: () => void;
  onChange: (profile: Profile) => void;
  onSave: (profile: Profile) => void;
  onValidationError: (message: string) => void;
};

export function ProfileEditor({
  draft,
  profile,
  onCancel,
  onChange,
  onSave,
  onValidationError,
}: ProfileEditorProps) {
  const errors = getEditableProfileErrors(draft);

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Object.keys(errors).length > 0) {
      onValidationError("Corrige les champs signalés.");
      return;
    }

    onSave(normalizeEditableProfile(draft));
  };

  return (
    <form className="mt-5 grid gap-6" noValidate onSubmit={submitProfile}>
      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-text-muted)]">
          Informations personnelles
        </legend>
        <FormField
          error={errors.firstName}
          id="profile-first-name"
          label="Prénom"
          required
        >
          <TextInput
            autoComplete="given-name"
            invalid={Boolean(errors.firstName)}
            maxLength={editableProfileLimits.firstNameMaxLength}
            value={draft.firstName}
            onChange={(event) =>
              onChange({ ...draft, firstName: event.target.value })
            }
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <ProfileNumberField
            error={errors.age}
            id="profile-age"
            label="Âge"
            max={editableProfileLimits.age.max}
            min={editableProfileLimits.age.min}
            step={1}
            value={draft.age}
            onChange={(age) => onChange({ ...draft, age })}
          />
          <ProfileNumberField
            error={errors.heightCm}
            id="profile-height"
            label="Taille"
            max={editableProfileLimits.heightCm.max}
            min={editableProfileLimits.heightCm.min}
            step={1}
            suffix="cm"
            value={draft.heightCm}
            onChange={(heightCm) => onChange({ ...draft, heightCm })}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-text-muted)]">
          Repères de poids
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <ProfileNumberField
            error={errors.startWeightKg}
            id="profile-start-weight"
            label="Poids de départ"
            max={editableProfileLimits.weightKg.max}
            min={editableProfileLimits.weightKg.min}
            step={0.1}
            suffix="kg"
            value={draft.startWeightKg}
            onChange={(startWeightKg) =>
              onChange({ ...draft, startWeightKg })
            }
          />
          <ProfileNumberField
            error={errors.goalWeightKg}
            id="profile-goal-weight"
            label="Objectif"
            max={editableProfileLimits.weightKg.max}
            min={editableProfileLimits.weightKg.min}
            step={0.1}
            suffix="kg"
            value={draft.goalWeightKg}
            onChange={(goalWeightKg) => onChange({ ...draft, goalWeightKg })}
          />
        </div>

        {hasStartWeightChanged(profile, draft) ? (
          <div className="flex gap-3 rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] p-3 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text)]">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--pc-color-primary)]"
              size={18}
            />
            <p>
              Ce poids est le point de départ affiché dans le Carnet. Le modifier
              ne supprime aucune pesée déjà enregistrée.
            </p>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-[length:var(--pc-font-size-secondary)] font-semibold text-[var(--pc-color-text-muted)]">
          Tabac
        </legend>
        <FormField id="profile-smoking-status" label="Situation actuelle">
          <Select
            value={draft.smokingStatus}
            onChange={(event) => {
              const smokingStatus = event.target
                .value as Profile["smokingStatus"];
              onChange({
                ...draft,
                smokingStatus,
                smokingGoal: profileNeedsSmokingGoal(smokingStatus)
                  ? draft.smokingGoal ?? "observer"
                  : undefined,
              });
            }}
          >
            {Object.entries(profileSmokingStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        {profileNeedsSmokingGoal(draft.smokingStatus) ? (
          <FormField
            error={errors.smokingGoal}
            id="profile-smoking-goal"
            label="Ce que tu souhaites"
          >
            <Select
              invalid={Boolean(errors.smokingGoal)}
              value={draft.smokingGoal ?? ""}
              onChange={(event) =>
                onChange({
                  ...draft,
                  smokingGoal: event.target.value as Profile["smokingGoal"],
                })
              }
            >
              <option disabled value="">
                Choisir
              </option>
              {Object.entries(profileSmokingGoalLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Button fullWidth type="submit">
          Enregistrer
        </Button>
        <Button fullWidth variant="tertiary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function ProfileNumberField({
  error,
  id,
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  value: number;
}) {
  return (
    <FormField
      error={error}
      id={id}
      label={suffix ? `${label} (${suffix})` : label}
      required
    >
      <TextInput
        inputMode={step === 1 ? "numeric" : "decimal"}
        invalid={Boolean(error)}
        max={max}
        min={min}
        step={step}
        type="number"
        value={Number.isFinite(value) && value > 0 ? value : ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? 0 : Number(event.target.value))
        }
      />
    </FormField>
  );
}
