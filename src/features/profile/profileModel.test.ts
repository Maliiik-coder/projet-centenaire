import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/types";
import {
  isValidEditableProfile,
  profileNeedsSmokingGoal,
} from "@/features/profile/profileModel";

const validProfile: Profile = {
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

describe("profileModel", () => {
  it("demande un objectif tabac uniquement aux fumeurs actuels", () => {
    expect(profileNeedsSmokingGoal("occasionnellement")).toBe(true);
    expect(profileNeedsSmokingGoal("tous-les-jours")).toBe(true);
    expect(profileNeedsSmokingGoal("non")).toBe(false);
    expect(profileNeedsSmokingGoal("arrete")).toBe(false);
  });

  it("valide les limites minimales du profil éditable", () => {
    expect(isValidEditableProfile(validProfile)).toBe(true);
    expect(isValidEditableProfile({ ...validProfile, firstName: " " })).toBe(false);
    expect(isValidEditableProfile({ ...validProfile, age: 17 })).toBe(false);
    expect(isValidEditableProfile({ ...validProfile, heightCm: 119 })).toBe(false);
    expect(isValidEditableProfile({ ...validProfile, goalWeightKg: 39 })).toBe(false);
  });
});
