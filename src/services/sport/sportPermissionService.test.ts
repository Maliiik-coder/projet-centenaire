import { describe, expect, it } from "vitest";
import {
  assertCanAccessSportResource,
  assertSportMutationBelongsToUser,
  canAccessSportResource,
  filterOwnedSportResources,
} from "@/services/sport/sportPermissionService";

describe("sportPermissionService", () => {
  it("autorise un utilisateur a lire sa propre ressource Sport", () => {
    expect(canAccessSportResource("user-a", { userId: "user-a" })).toBe(true);
  });

  it("refuse l'acces a une ressource Sport d'un autre utilisateur", () => {
    expect(canAccessSportResource("user-a", { userId: "user-b" })).toBe(false);
    expect(() =>
      assertCanAccessSportResource("user-a", { userId: "user-b" }),
    ).toThrow("Acces refuse");
  });

  it("filtre les ressources au proprietaire courant", () => {
    expect(
      filterOwnedSportResources("user-a", [
        { userId: "user-a", id: 1 },
        { userId: "user-b", id: 2 },
      ]),
    ).toEqual([{ userId: "user-a", id: 1 }]);
  });

  it("bloque une mutation qui ne porte pas le bon user_id", () => {
    expect(() =>
      assertSportMutationBelongsToUser("user-a", { userId: "user-b" }),
    ).toThrow("Acces refuse");
  });
});
