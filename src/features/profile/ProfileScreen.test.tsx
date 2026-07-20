import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AppData, Profile } from "@/lib/types";
import { ProfileScreen } from "@/features/profile/ProfileScreen";

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
  weights: [],
  smokingEntries: [],
  activities: [],
};

function renderProfile(
  overrides: Partial<{
    cloudUserId: string | null;
    editorOpen: boolean;
    profileDraft: Profile;
  }> = {},
) {
  return renderToStaticMarkup(
    <ProfileScreen
      cloudEmail={overrides.cloudUserId ? "camille@example.com" : null}
      cloudUserId={overrides.cloudUserId ?? null}
      currentDate="2026-07-20"
      data={data}
      editorOpen={overrides.editorOpen ?? false}
      formatKg={(value) => `${value ?? 0} kg`}
      profile={profile}
      profileDraft={overrides.profileDraft ?? profile}
      onChangeDraft={() => {}}
      onChangeEditorOpen={() => {}}
      onImportFile={async () => {}}
      onOpenBehaviorEditor={() => {}}
      onPreferencesChange={() => {}}
      onResetData={async () => {}}
      onSaveProfile={() => {}}
      onSignOut={async () => {}}
      onValidationError={() => {}}
    />,
  );
}

describe("ProfileScreen", () => {
  it("sépare les cinq zones attendues du profil", () => {
    const html = renderProfile();

    expect(html).toContain("Résumé personnel");
    expect(html).toContain("Portrait initial");
    expect(html).toContain("Préférences");
    expect(html).toContain("Compte");
    expect(html).toContain("Options avancées");
    expect(html).toContain("Afficher le repère du jour");
  });

  it("garde les outils techniques repliés par défaut", () => {
    const html = renderProfile();

    expect(html).toContain("Données de l’application");
    expect(html).not.toContain("Exporter mes données");
    expect(html).not.toContain("Réinitialiser les données locales");
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

  it("distingue clairement un compte cloud du carnet local", () => {
    expect(renderProfile()).toContain("Carnet local");
    expect(renderProfile({ cloudUserId: "user-1" })).toContain(
      "Compte connecté",
    );
  });
});
