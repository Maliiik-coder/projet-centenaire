import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AppData, Profile } from "@/lib/types";
import {
  ProfileScreen,
  ProfileSportSection,
} from "@/features/profile/ProfileScreen";

const profile: Profile = {
  firstName: "Camille",
  age: 38,
  heightCm: 175,
  startWeightKg: 110,
  goalWeightKg: 90,
  startDate: "2026-07-16",
  initialFriction: "unknown",
  smokingStatus: "non",
  showActiveMission: true,
  darkMode: false,
  weeklyActivityGoal: 5,
  createdAt: "2026-07-16T08:00:00.000Z",
};

const data: AppData = {
  profile,
  meals: [],
  weights: [
    {
      id: "weight-1",
      date: "2026-07-19",
      time: "08:00",
      weightKg: 108.2,
      createdAt: "2026-07-19T08:00:00.000Z",
    },
    {
      id: "weight-2",
      date: "2026-07-20",
      time: "08:00",
      weightKg: 107.6,
      createdAt: "2026-07-20T08:00:00.000Z",
    },
  ],
  smokingEntries: [],
  activities: [],
};

function profileScreenProps(
  overrides: Partial<{
    cloudUserId: string | null;
    data: AppData;
    editorOpen: boolean;
    onOpenSportProfile: () => void;
    profile: Profile;
    profileDraft: Profile;
  }> = {},
) {
  const nextProfile = overrides.profile ?? profile;
  const nextData = overrides.data ?? { ...data, profile: nextProfile };

  return {
    cloudEmail: overrides.cloudUserId ? "camille@example.com" : null,
    cloudUserId: overrides.cloudUserId ?? null,
    currentDate: "2026-07-20",
    data: nextData,
    editorOpen: overrides.editorOpen ?? false,
    formatKg: (value: number | null | undefined) => `${value ?? 0} kg`,
    profile: nextProfile,
    profileDraft: overrides.profileDraft ?? nextProfile,
    onChangeDraft: () => {},
    onChangeEditorOpen: () => {},
    onImportFile: async () => {},
    onOpenBehaviorEditor: () => {},
    onOpenSportProfile: overrides.onOpenSportProfile,
    onPreferencesChange: () => {},
    onResetData: async () => {},
    onSaveProfile: () => {},
    onSignOut: async () => {},
    onValidationError: () => {},
  };
}

function renderProfile(
  overrides: Partial<{
    cloudUserId: string | null;
    data: AppData;
    editorOpen: boolean;
    onOpenSportProfile: () => void;
    profile: Profile;
    profileDraft: Profile;
  }> = {},
) {
  return renderToStaticMarkup(<ProfileScreen {...profileScreenProps(overrides)} />);
}

describe("ProfileScreen", () => {
  it("organise le profil en sections produit lisibles", () => {
    const html = renderProfile({ onOpenSportProfile: () => {} });

    expect(html).toContain("Profil général");
    expect(html).toContain("Profil alimentaire");
    expect(html).toContain("Profil sportif");
    expect(html).toContain("Préférences");
    expect(html).toContain("Compte");
    expect(html).toContain("Options avancées");
    expect(html).toContain("107.6 kg");
    expect(html).toContain("Poids actuel");
    expect(html).toContain("Afficher le repère du jour");
  });

  it("garde les outils techniques repliés par défaut", () => {
    const html = renderProfile();

    expect(html).toContain("Données de l’application");
    expect(html).not.toContain("Exporter mes données");
    expect(html).not.toContain("Réinitialiser les données locales");
  });

  it("affiche un état poids actuel à compléter sans mesure enregistrée", () => {
    const html = renderProfile({
      data: { ...data, weights: [] },
    });

    expect(html).toContain("À compléter");
    expect(html).toContain("sans extrapoler");
  });

  it("ouvre un éditeur explicite avec sauvegarde et annulation", () => {
    const html = renderProfile({
      editorOpen: true,
    });

    expect(html).toContain("Informations personnelles");
    expect(html).toContain("Enregistrer");
    expect(html).toContain("Annuler");
  });

  it("signale l'impact d'un nouveau poids de départ dans l'éditeur", () => {
    const html = renderProfile({
      editorOpen: true,
      profileDraft: { ...profile, startWeightKg: 105 },
    });

    expect(html).toContain("point de départ affiché dans le Carnet");
    expect(html).toContain("ne supprime aucune pesée déjà enregistrée");
  });

  it("expose les erreurs de validation dans l'éditeur", () => {
    const html = renderProfile({
      editorOpen: true,
      profileDraft: {
        ...profile,
        firstName: " ",
        age: 17,
        heightCm: 221,
        startWeightKg: 29,
        goalWeightKg: 251,
      },
    });

    expect(html).toContain("Indique ton prénom.");
    expect(html).toContain("Entre 18 et 100 ans.");
    expect(html).toContain("Entre 100 et 220 cm.");
    expect(html).toContain("Entre 30 et 250 kg.");
    expect(html).toContain('aria-invalid="true"');
  });

  it("marque l'objectif tabac invalide lorsqu'il est requis", () => {
    const html = renderProfile({
      editorOpen: true,
      profileDraft: {
        ...profile,
        smokingStatus: "tous-les-jours",
        smokingGoal: undefined,
      },
    });

    expect(html).toContain('id="profile-smoking-goal"');
    expect(html).toContain('aria-describedby="profile-smoking-goal-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(
      "Choisis ce que tu souhaites faire concernant le tabac.",
    );
  });

  it("résume le tabac uniquement lorsqu'il concerne le suivi", () => {
    expect(renderProfile()).not.toContain("Situation déclarée");

    const html = renderProfile({
      profile: {
        ...profile,
        smokingStatus: "tous-les-jours",
        smokingGoal: "reduire",
      },
    });

    expect(html).toContain("Situation déclarée");
    expect(html).toContain("Tous les jours · Réduire");
    expect(html).toContain("sans conseil médical");
  });

  it("expose et déclenche le callback du profil sportif", () => {
    const onOpenSportProfile = vi.fn();
    const html = renderProfile({ onOpenSportProfile });
    const section = ProfileSportSection({
      onOpenSportProfile,
    }) as ReactElement<{
      action: ReactElement<{ disabled?: boolean; onClick?: () => void }>;
    }>;

    expect(html).toContain("Profil sportif");
    expect(html).toContain("Cette page ne lit pas ses données directement");
    expect(section.props.action.props.disabled).toBe(false);

    section.props.action.props.onClick?.();
    expect(onOpenSportProfile).toHaveBeenCalledTimes(1);
  });

  it("distingue clairement un compte cloud du carnet local", () => {
    expect(renderProfile()).toContain("Carnet local");
    expect(renderProfile({ cloudUserId: "user-1" })).toContain(
      "Compte connecté",
    );
  });
});
