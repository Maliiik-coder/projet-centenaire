"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  HardDrive,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui";
import type { AppData } from "@/lib/types";

type ProfileAdvancedOptionsProps = {
  currentDate: string;
  data: AppData;
  onImportFile: (file: File) => Promise<void>;
  onResetData: () => Promise<void>;
};

export function ProfileAdvancedOptions({
  currentDate,
  data,
  onImportFile,
  onResetData,
}: ProfileAdvancedOptionsProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <section aria-labelledby="profile-advanced-title">
      <p className={eyebrowClass}>Options avancées</p>
      <button
        aria-expanded={open}
        aria-controls="profile-advanced-content"
        className="pc-focus-ring mt-3 flex min-h-14 w-full items-center gap-3 rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface-subtle)] px-4 py-3 text-left"
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setConfirmingReset(false);
        }}
      >
        <HardDrive
          aria-hidden="true"
          className="shrink-0 text-[var(--pc-color-text-muted)]"
          size={20}
        />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[length:var(--pc-font-size-body)] font-semibold text-[var(--pc-color-text)]"
            id="profile-advanced-title"
          >
            Données de l’application
          </span>
          <span className="mt-0.5 block text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
            Sauvegarde, récupération et remise à zéro
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-[var(--pc-color-text-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          size={20}
        />
      </button>

      {open ? (
        <div className="mt-3 grid gap-2" id="profile-advanced-content">
          <Button
            fullWidth
            className="justify-start"
            variant="tertiary"
            onClick={() => exportProfileData(data, currentDate)}
          >
            <Download aria-hidden="true" size={18} />
            Exporter mes données
          </Button>
          <Button
            fullWidth
            className="justify-start"
            variant="tertiary"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload aria-hidden="true" size={18} />
            Importer des données
          </Button>
          <input
            ref={importInputRef}
            accept="application/json"
            className="hidden"
            type="file"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              try {
                await onImportFile(file);
              } finally {
                event.target.value = "";
              }
            }}
          />

          {confirmingReset ? (
            <div
              aria-live="polite"
              className="mt-2 rounded-[var(--pc-radius-card)] bg-[var(--pc-color-danger-soft)] p-4"
            >
              <p className="text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-text)]">
                Réinitialiser les données locales de cet appareil ?
              </p>
              <p className="mt-1 text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]">
                Cette action ne peut pas être annulée.
              </p>
              <div className="mt-3 grid gap-2">
                <Button
                  fullWidth
                  variant="danger"
                  onClick={() => void onResetData()}
                >
                  Confirmer la réinitialisation
                </Button>
                <Button
                  fullWidth
                  variant="tertiary"
                  onClick={() => setConfirmingReset(false)}
                >
                  Garder mes données
                </Button>
              </div>
            </div>
          ) : (
            <Button
              fullWidth
              className="justify-start"
              variant="tertiary"
              onClick={() => setConfirmingReset(true)}
            >
              <RefreshCw aria-hidden="true" size={18} />
              Réinitialiser les données locales
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

const eyebrowClass =
  "text-[length:var(--pc-font-size-meta)] font-semibold uppercase text-[var(--pc-color-text-muted)]";

function exportProfileData(payload: AppData, date: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `projet-centenaire-carnet-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
