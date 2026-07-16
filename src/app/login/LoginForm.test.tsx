import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/app/login/LoginForm";

describe("LoginForm", () => {
  it("propose le cloud et le mode limité à l’appareil", () => {
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain("Continuer avec Google");
    expect(html).toContain("Continuer avec une adresse email");
    expect(html).toContain("Continuer uniquement sur ce téléphone");
  });
});
