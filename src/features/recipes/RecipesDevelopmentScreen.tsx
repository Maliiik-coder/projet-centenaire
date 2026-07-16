"use client";

import { ChefHat } from "lucide-react";
import { BackButton, Surface, TopBar } from "@/components/ui";

export function RecipesDevelopmentScreen() {
  return (
    <main className="pc-screen">
      <div className="pc-screen-inner flex min-h-dvh flex-col">
        <TopBar label="En développement" />

        <section className="flex flex-1 flex-col justify-center py-8">
          <BackButton
            className="mb-8 self-start"
            fallbackHref="/?app-resume=1&tab=today"
            label="Retour à Haru"
          />

          <Surface className="px-5 py-6" variant="subtle">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-[var(--pc-radius-control)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
            >
              <ChefHat size={24} strokeWidth={2.2} />
            </span>
            <p className="mt-6 text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-primary)]">
              En développement
            </p>
            <h1 className="mt-2 text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              Recettes
            </h1>
            <p className="mt-3 max-w-sm text-[length:var(--pc-font-size-body)] leading-[var(--pc-line-height-relaxed)] text-[var(--pc-color-text-muted)]">
              Le carnet de recettes Haru se prépare.
            </p>
          </Surface>
        </section>
      </div>
    </main>
  );
}
