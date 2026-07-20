import { describe, expect, it } from "vitest";
import {
  ADMIN_PREVIEW_ENV_NAME,
  canRenderAdminPreview,
} from "./previewAccessPolicy";

describe("admin preview access policy", () => {
  it("refuse la maquette en production sans activation serveur explicite", () => {
    expect(
      canRenderAdminPreview({
        environment: "production",
        enabledFlag: undefined,
      }),
    ).toBe(false);
    expect(
      canRenderAdminPreview({
        environment: "production",
        enabledFlag: "false",
      }),
    ).toBe(false);
  });

  it("autorise la maquette en production uniquement avec la valeur exacte true", () => {
    expect(
      canRenderAdminPreview({
        environment: "production",
        enabledFlag: "true",
      }),
    ).toBe(true);
    expect(ADMIN_PREVIEW_ENV_NAME.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  it("reste visible dans les environnements locaux de travail", () => {
    expect(
      canRenderAdminPreview({
        environment: "development",
        enabledFlag: undefined,
      }),
    ).toBe(true);
    expect(
      canRenderAdminPreview({
        environment: "test",
        enabledFlag: undefined,
      }),
    ).toBe(true);
  });
});
