"use client";

import { useState } from "react";
import { ImportValidationError } from "@/lib/dataValidation";
import { mergeImportedData } from "@/lib/importData";
import {
  buildProfilePatch,
  createProfilePatchMutationDraft,
} from "@/lib/nonMealData";
import { legacyFrictionFromAssessment } from "@/lib/onboarding";
import type {
  AppData,
  InitialBehaviorAssessment,
  Profile,
} from "@/lib/types";
import type { SaveAppData } from "@/features/session/useAppDataSession";
import { createMealUpsertMutation } from "@/services/offlineSyncService";

type ProfileControllerOptions = {
  cloudUserId: string | null;
  data: AppData | null;
  saveData: SaveAppData;
  setError: (error: string | null) => void;
};

export function useProfileController({
  cloudUserId,
  data,
  saveData,
  setError,
}: ProfileControllerOptions) {
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [behaviorEditorOpen, setBehaviorEditorOpen] = useState(false);
  const profile = data?.profile ?? null;

  const changeProfileEditorOpen = (open: boolean) => {
    setProfileDraft(open ? profile : null);
    setProfileEditorOpen(open);
  };

  const updateProfilePreferences = (
    nextPreferences: Partial<Pick<Profile, "darkMode" | "showActiveMission">>,
  ) => {
    if (!data || !profile) return;

    const nextProfile = {
      ...profile,
      ...nextPreferences,
    };
    const mutation = createProfilePatchMutationDraft(nextPreferences);

    saveData(
      { ...data, profile: nextProfile },
      "Préférence mise à jour.",
      mutation ? [mutation] : [],
    );
  };

  const saveBehaviorAssessment = (
    initialBehaviorAssessment: InitialBehaviorAssessment,
  ) => {
    if (!data || !profile) return;

    const nextProfile: Profile = {
      ...profile,
      initialBehaviorAssessment,
      initialFriction: legacyFrictionFromAssessment(initialBehaviorAssessment),
    };
    const patch = buildProfilePatch(profile, nextProfile);
    const mutation = createProfilePatchMutationDraft(patch);

    saveData(
      { ...data, profile: nextProfile },
      "Portrait initial mis à jour.",
      mutation ? [mutation] : [],
    );
    setProfileDraft(nextProfile);
    setBehaviorEditorOpen(false);
  };

  const saveProfileChanges = (nextProfile: Profile) => {
    if (!data || !profile) return;

    const patch = buildProfilePatch(profile, nextProfile);
    const mutation = createProfilePatchMutationDraft(patch);

    saveData(
      { ...data, profile: nextProfile },
      "Profil mis à jour.",
      mutation ? [mutation] : [],
    );
    setProfileDraft(null);
    setProfileEditorOpen(false);
  };

  const importProfileData = async (file: File) => {
    if (!data) return;

    try {
      const parsedImport: unknown = JSON.parse(await file.text());
      const imported = mergeImportedData(data, parsedImport);

      if (imported.recognizedContributionCount === 0) {
        setError("Aucune donnée nouvelle valide n’a été reconnue.");
        return;
      }

      const importedMealMutations = cloudUserId
        ? imported.mealUpserts.map((meal) =>
            createMealUpsertMutation(cloudUserId, meal),
          )
        : [];
      saveData(
        imported.data,
        "Import terminé.",
        imported.nonMealMutations,
        importedMealMutations,
      );
    } catch (importError) {
      setError(
        importError instanceof ImportValidationError
          ? "Une date ou heure du fichier est invalide. Aucune donnée n’a été importée."
          : "Le fichier JSON n'a pas pu être importé.",
      );
    }
  };

  return {
    behaviorEditorOpen,
    changeProfileEditorOpen,
    closeBehaviorEditor: () => setBehaviorEditorOpen(false),
    importProfileData,
    openBehaviorEditor: () => setBehaviorEditorOpen(true),
    profileDraft,
    profileEditorOpen,
    saveBehaviorAssessment,
    saveProfileChanges,
    setProfileDraft,
    updateProfilePreferences,
  };
}
