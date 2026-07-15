import { describe, expect, it } from "vitest";
import { buttonClassName, type ButtonVariant } from "@/components/ui/Button";

describe("buttonClassName", () => {
  it.each<[ButtonVariant, string]>([
    ["primary", "--pc-color-primary"],
    ["secondary", "--pc-color-primary-soft"],
    ["tertiary", "--pc-color-primary-soft"],
    ["danger", "--pc-color-danger-soft"],
  ])("résout la variante %s avec un token sémantique", (variant, token) => {
    expect(buttonClassName({ variant })).toContain(token);
  });

  it("ajoute uniquement les options de largeur et de classe demandées", () => {
    const classes = buttonClassName({
      className: "test-class",
      fullWidth: true,
      variant: "secondary",
    });

    expect(classes).toContain("w-full");
    expect(classes).toContain("test-class");
  });
});
