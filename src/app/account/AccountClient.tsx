"use client";

import { useState } from "react";
import { Download, LogOut, Trash2 } from "lucide-react";
import {
  BackButton,
  Button,
  ErrorState,
  FormField,
  Surface,
  TextInput,
  TopBar,
} from "@/components/ui";
import { clearLocalEntryMode } from "@/lib/entryMode";
import { localDataStore, userStorageScope } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { exportCloudData } from "@/services/cloudDataService";
import { clearMigrationOperationForDeletedUser } from "@/services/localMigrationService";
import {
  removePendingSyncStateForDeletedUser,
} from "@/services/offlineSyncService";

export function AccountClient({
  email,
  configured,
}: {
  email: string | null;
  configured: boolean;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const exportData = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase n'est pas configuré.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Connecte-toi pour exporter les données cloud.");
      return;
    }

    const data = await exportCloudData(supabase, user.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `projet-centenaire-cloud-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Export cloud généré.");
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    clearLocalEntryMode();
    window.location.href = "/login";
  };

  const deleteAccount = async () => {
    if (confirmation !== "SUPPRIMER") {
      setError("Écris SUPPRIMER pour confirmer.");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const localUserId = session?.user.id ?? null;

    const response = await fetch("/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      authDeleted?: boolean;
      error?: string;
    };

    setIsDeleting(false);

    if (!response.ok || !result.ok) {
      setError(result.error ?? "Suppression impossible.");
      return;
    }

    if (localUserId) {
      localDataStore.reset(userStorageScope(localUserId));
      await removePendingSyncStateForDeletedUser(localUserId);
      await clearMigrationOperationForDeletedUser(localUserId);
    }

    await supabase?.auth.signOut();
    clearLocalEntryMode();
    window.location.href = result.authDeleted ? "/login?deleted=1" : "/";
  };

  return (
    <main className="pc-screen">
      <div className="pc-screen-inner">
        <TopBar label="Compte" />

        <div className="space-y-5 py-6 sm:py-8">
          <BackButton label="Retour au carnet" />

          <Surface as="section" className="p-5">
            <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-text-muted)]">
              Session
            </p>
            <h1 className="mt-2 text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              Sauvegarde cloud.
            </h1>
            <p className="mt-3 break-words text-[length:var(--pc-font-size-body)] leading-[var(--pc-line-height-relaxed)] text-[var(--pc-color-text-muted)]">
              {configured
                ? email ?? "Compte connecté."
                : "Supabase n'est pas encore configuré."}
            </p>
            <div className="mt-5 grid gap-3">
              <Button
                onClick={exportData}
                disabled={!configured}
                fullWidth
                variant="secondary"
              >
                <Download
                  aria-hidden="true"
                  className="hidden min-[350px]:block"
                  size={17}
                />
                <span className="text-[length:var(--pc-font-size-meta)]">
                  Export JSON des données cloud
                </span>
              </Button>
              <Button
                onClick={signOut}
                disabled={!configured}
                fullWidth
                variant="secondary"
              >
                <LogOut aria-hidden="true" size={17} />
                Se déconnecter
              </Button>
            </div>
          </Surface>

          <Surface as="section" className="p-5" variant="subtle">
            <p className="text-[length:var(--pc-font-size-meta)] leading-4 font-semibold text-[var(--pc-color-danger)]">
              Suppression
            </p>
            <p className="mt-3 text-[length:var(--pc-font-size-body)] leading-[var(--pc-line-height-relaxed)] text-[var(--pc-color-text-muted)]">
              Cette action supprime les données applicatives liées à ce compte.
              L&apos;utilisateur Auth est aussi supprimé si la clé serveur dédiée est
              configurée.
            </p>
            <FormField className="mt-4" id="delete-confirmation" label="Confirmation">
              <TextInput
                autoComplete="off"
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Écrire SUPPRIMER"
              />
            </FormField>
            <Button
              className="mt-4"
              disabled={!configured || confirmation !== "SUPPRIMER" || isDeleting}
              fullWidth
              loading={isDeleting}
              loadingLabel="Suppression..."
              onClick={deleteAccount}
              variant="danger"
            >
              <Trash2 aria-hidden="true" size={17} />
              Supprimer le compte
            </Button>
          </Surface>

          {message ? (
            <p
              className="rounded-[var(--pc-radius-card)] border border-[var(--pc-color-success)] bg-[var(--pc-color-success-soft)] p-3 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]"
              role="status"
            >
              {message}
            </p>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
        </div>
      </div>
    </main>
  );
}
