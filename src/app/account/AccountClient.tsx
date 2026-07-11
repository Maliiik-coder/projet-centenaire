"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Download, LogOut, Trash2 } from "lucide-react";
import { LogoHorizontal } from "@/components/Logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { exportCloudData } from "@/services/cloudDataService";

const buttonClass =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/35 active:translate-y-px active:scale-[0.99]";

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 text-base text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.035)] outline-none placeholder:text-[#7A7166] focus:border-[#3E6670] focus:ring-2 focus:ring-[#3E6670]/15";

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
    window.location.href = "/";
  };

  const deleteAccount = async () => {
    if (confirmation !== "SUPPRIMER") {
      setError("Écris SUPPRIMER pour confirmer.");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

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

    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    window.location.href = result.authDeleted ? "/login?deleted=1" : "/";
  };

  return (
    <main className="min-h-dvh bg-[#F6F4EC] px-5 py-6 text-[#171512]">
      <div className="mx-auto max-w-md">
        <header className="mb-8 flex flex-col items-start gap-2 rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)] min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
          <LogoHorizontal
            className="min-w-0"
            markClassName="size-10 shrink-0 text-[#171512]"
            textClassName="whitespace-nowrap font-serif text-xl leading-none text-[#171512]"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166] min-[390px]:shrink-0">
            Compte
          </p>
        </header>

        <div className="space-y-5">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3A3732]"
            href="/"
          >
            <ChevronLeft aria-hidden="true" size={17} />
            Retour au carnet
          </Link>

          <section className="rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] p-4 shadow-[0_12px_28px_rgba(23,21,18,0.045)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166]">
              Session
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight">
              Sauvegarde cloud.
            </h1>
            <p className="mt-3 leading-7 text-[#3A3732]">
              {configured
                ? email ?? "Compte connecté."
                : "Supabase n'est pas encore configuré."}
            </p>
            <div className="mt-5 grid gap-3">
              <button
                className={`${buttonClass} border border-[#D7CEC0] bg-[#FAF8F1] text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.04)]`}
                type="button"
                onClick={exportData}
                disabled={!configured}
              >
                <Download aria-hidden="true" size={17} />
                Export JSON des données cloud
              </button>
              <button
                className={`${buttonClass} border border-[#D7CEC0] bg-[#FAF8F1] text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.04)]`}
                type="button"
                onClick={signOut}
                disabled={!configured}
              >
                <LogOut aria-hidden="true" size={17} />
                Se déconnecter
              </button>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#D7B8B2] bg-[#FFF7F3] p-4 shadow-[0_12px_28px_rgba(23,21,18,0.045)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A3B32]">
              Suppression
            </p>
            <p className="mt-3 leading-7 text-[#3A3732]">
              Cette action supprime les données applicatives liées à ce compte.
              L&apos;utilisateur Auth est aussi supprimé si la clé serveur dédiée est
              configurée.
            </p>
            <label className="mt-4 grid gap-2 text-sm text-[#3A3732]">
              Confirmation
              <input
                className={inputClass}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Écrire SUPPRIMER"
              />
            </label>
            <button
              className={`${buttonClass} mt-4 border border-[#D7B8B2] bg-[#FFF7F3] text-[#8A3B32] disabled:cursor-not-allowed disabled:opacity-50`}
              type="button"
              disabled={!configured || confirmation !== "SUPPRIMER" || isDeleting}
              onClick={deleteAccount}
            >
              <Trash2 aria-hidden="true" size={17} />
              {isDeleting ? "Suppression..." : "Supprimer le compte"}
            </button>
          </section>

          {message ? (
            <p className="rounded-[18px] border border-[#CAD8C8] bg-[#F3FAF0] p-3 text-sm leading-6 text-[#3A3732]">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-[18px] border border-[#D7B8B2] bg-[#FFF7F3] p-3 text-sm leading-6 text-[#3A3732]">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
