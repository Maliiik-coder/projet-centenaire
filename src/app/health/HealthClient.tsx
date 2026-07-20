"use client";

import { useSyncExternalStore } from "react";
import { LogoHorizontal } from "@/components/Logo";
import { BackButton } from "@/components/ui";

export type HealthStatus = {
  version: string;
  environment: string;
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  appleOAuthEnabled: boolean;
  pwaManifestPresent: boolean;
};

function yesNo(value: boolean): string {
  return value ? "oui" : "non";
}

function readLocalStorageStatus(): string {
  if (typeof window === "undefined") {
    return "verification...";
  }

  try {
    const probeKey = "projet-centenaire-health";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return "oui";
  } catch {
    return "non";
  }
}

function subscribeToLocalStorageStatus(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const timer = window.setTimeout(onStoreChange, 0);

  return () => window.clearTimeout(timer);
}

export function HealthClient({ status }: { status: HealthStatus }) {
  const localStorageStatus = useSyncExternalStore(
    subscribeToLocalStorageStatus,
    readLocalStorageStatus,
    () => "verification...",
  );

  const rows = [
    ["version", status.version],
    ["environnement", status.environment],
    ["Supabase URL configuree", yesNo(status.supabaseUrlConfigured)],
    ["Supabase anon key configuree", yesNo(status.supabaseAnonKeyConfigured)],
    ["Service role configuree cote serveur", yesNo(status.serviceRoleConfigured)],
    ["Apple OAuth active", yesNo(status.appleOAuthEnabled)],
    ["PWA manifest present", yesNo(status.pwaManifestPresent)],
    ["localStorage disponible", localStorageStatus],
  ];

  return (
    <main className="app-screen">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col gap-8">
        <BackButton label="Retour au carnet" />
        <header className="flex items-center justify-between gap-4">
          <LogoHorizontal
            className="h-10 w-auto max-w-[50vw] shrink-0"
            priority
          />
          <span className="rounded-full border border-[#D7CEC0] bg-[#FAF8F1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7A7166]">
            Health
          </span>
        </header>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166]">
              Diagnostic technique
            </p>
            <h1 className="font-serif text-4xl leading-tight">
              Etat du deploiement
            </h1>
            <p className="leading-7 text-[#3A3732]">
              Cette page affiche uniquement des statuts non sensibles.
            </p>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#DDD5C7] bg-[#FAF8F1] shadow-[0_12px_28px_rgba(23,21,18,0.06)]">
            {rows.map(([label, value]) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#E6DFD3] px-4 py-4 last:border-b-0"
                key={label}
              >
                <span className="text-sm text-[#3A3732]">{label}</span>
                <span className="text-sm font-semibold text-[#171512]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
