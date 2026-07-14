"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { LogoHorizontal } from "@/components/Logo";
import { buildAuthCallbackUrl, safeAuthNext } from "@/lib/authRedirect";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const inputClass =
  "min-h-12 w-full rounded-[16px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 text-base text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.035)] outline-none placeholder:text-[#7A7166] focus:border-[#3E6670] focus:ring-2 focus:ring-[#3E6670]/15";

const buttonClass =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E6670]/35 active:translate-y-px active:scale-[0.99]";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const configured = isSupabaseConfigured();
  const appleEnabled = process.env.NEXT_PUBLIC_ENABLE_APPLE_OAUTH === "true";
  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return safeAuthNext(new URLSearchParams(window.location.search).get("next"));
  }, []);

  const redirectTo = () =>
    buildAuthCallbackUrl(nextPath, window.location.origin);

  const signInWithGoogle = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase n'est pas encore configuré.");
      return;
    }

    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const signInWithApple = async () => {
    if (!appleEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase n'est pas encore configuré.");
      return;
    }

    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: redirectTo() },
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase n'est pas encore configuré.");
      return;
    }

    if (!email.includes("@")) {
      setError("Indique une adresse email valide.");
      return;
    }

    setIsSending(true);
    setError(null);
    setMessage(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });

    setIsSending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Lien envoyé. Ouvre-le depuis ta boîte mail pour continuer.");
  };

  return (
    <main className="app-screen">
      <div className="app-inner-screen mx-auto flex max-w-md flex-col">
        <header className="mb-8 flex flex-col items-start gap-2 rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] px-4 py-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)] min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
          <LogoHorizontal
            className="min-w-0"
            markClassName="h-10 w-auto shrink-0 text-[#171512]"
            textClassName="whitespace-nowrap font-serif text-xl leading-none text-[#171512]"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166] min-[390px]:shrink-0">
            Connexion
          </p>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-7">
          <div className="space-y-3">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#3A3732]"
              href="/"
            >
              <ChevronLeft aria-hidden="true" size={17} />
              Retour au carnet
            </Link>
            <h1 className="font-serif text-4xl leading-tight">
              Retrouver son carnet.
            </h1>
            <p className="leading-7 text-[#3A3732]">
              La sauvegarde cloud sert uniquement à garder tes observations entre
              appareils.
            </p>
          </div>

          {!configured ? (
            <p className="rounded-[18px] border border-[#D7B8B2] bg-[#FFF7F3] p-3 text-sm leading-6 text-[#3A3732]">
              Supabase n&apos;est pas encore configuré. Ajoute les variables
              d&apos;environnement pour activer la connexion.
            </p>
          ) : null}

          <div className="grid gap-3">
            <button
              className={`${buttonClass} bg-[#171512] text-[#F3EDE2] shadow-[0_10px_22px_rgba(23,21,18,0.16)] disabled:cursor-not-allowed disabled:opacity-50`}
              type="button"
              disabled={!configured}
              onClick={signInWithGoogle}
            >
              Continuer avec Google
            </button>
            <button
              className={`${buttonClass} border border-[#D7CEC0] bg-[#FAF8F1] text-[#171512] shadow-[0_8px_18px_rgba(23,21,18,0.04)] disabled:cursor-not-allowed disabled:opacity-60`}
              type="button"
              disabled={!configured || !appleEnabled}
              onClick={signInWithApple}
            >
              {appleEnabled
                ? "Continuer avec Apple"
                : "Connexion Apple bientôt disponible"}
            </button>
          </div>

          <form className="space-y-3" onSubmit={sendMagicLink}>
            <label className="grid gap-2 text-sm text-[#3A3732]">
              Email
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom@example.com"
              />
            </label>
            <button
              className={`${buttonClass} border border-[#C7D4D2] bg-[#E6EFED] text-[#2F5E68] shadow-[0_6px_14px_rgba(62,102,112,0.08)] disabled:cursor-not-allowed disabled:opacity-50`}
              type="submit"
              disabled={!configured || isSending}
            >
              {isSending ? "Envoi..." : "Recevoir un lien de connexion"}
            </button>
          </form>

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
        </section>
      </div>
    </main>
  );
}
