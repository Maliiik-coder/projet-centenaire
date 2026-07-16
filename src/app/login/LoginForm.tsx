"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import {
  Button,
  ErrorState,
  FormField,
  Surface,
  TextInput,
  TopBar,
} from "@/components/ui";
import { buildAuthCallbackUrl, safeAuthNext } from "@/lib/authRedirect";
import {
  clearLocalEntryMode,
  onboardingEntryPath,
  selectLocalEntryMode,
} from "@/lib/entryMode";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

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

    const requestedNext = new URLSearchParams(window.location.search).get("next");
    return requestedNext
      ? safeAuthNext(requestedNext)
      : onboardingEntryPath(false);
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
    clearLocalEntryMode();
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
    clearLocalEntryMode();
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
    clearLocalEntryMode();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo(),
        shouldCreateUser: true,
      },
    });

    setIsSending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Lien envoyé. Ouvre-le depuis ta boîte mail pour continuer.");
  };

  return (
    <main className="pc-screen">
      <div className="pc-screen-inner flex flex-col">
        <TopBar label="Connexion" />

        <section className="flex flex-1 flex-col justify-center gap-6 py-8 sm:py-12">
          <div className="space-y-4">
            <Link
              className="pc-focus-ring inline-flex min-h-12 items-center gap-2 rounded-[var(--pc-radius-compact)] text-[length:var(--pc-font-size-secondary)] leading-5 font-semibold text-[var(--pc-color-primary)]"
              href="/"
            >
              <ChevronLeft aria-hidden="true" size={17} />
              Retour
            </Link>
            <h1 className="max-w-sm text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              Ouvrir Haru.
            </h1>
            <p className="max-w-md text-[length:var(--pc-font-size-body)] leading-[var(--pc-line-height-relaxed)] text-[var(--pc-color-text-muted)]">
              Choisis comment retrouver ton carnet aujourd’hui.
            </p>
          </div>

          {!configured ? (
            <ErrorState message="Supabase n'est pas encore configuré. Ajoute les variables d'environnement pour activer la connexion." />
          ) : null}

          <div className="grid gap-3">
            <Button
              disabled={!configured}
              fullWidth
              onClick={signInWithGoogle}
            >
              Continuer avec Google
            </Button>
            {appleEnabled ? (
              <Button
                disabled={!configured}
                fullWidth
                onClick={signInWithApple}
                variant="secondary"
              >
                Continuer avec Apple
              </Button>
            ) : null}
          </div>

          <Surface as="section" className="p-4 sm:p-5" variant="default">
            <form className="space-y-3" onSubmit={sendMagicLink}>
              <div className="space-y-1">
                <h2 className="font-semibold text-[var(--pc-color-text)]">
                  Continuer avec une adresse email
                </h2>
                <p className="text-sm leading-5 text-[var(--pc-color-text-muted)]">
                  Un compte sera créé automatiquement si cette adresse est nouvelle.
                </p>
              </div>
              <FormField id="login-email" label="Email">
                <TextInput
                  autoComplete="email"
                  id="login-email"
                  placeholder="prenom@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FormField>
              <Button
                disabled={!configured || isSending}
                fullWidth
                loading={isSending}
                loadingLabel="Envoi..."
                type="submit"
                variant="secondary"
              >
                Recevoir mon lien
              </Button>
            </form>
          </Surface>

          <div className="space-y-3 border-t border-[var(--pc-color-border)] pt-5">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                selectLocalEntryMode();
                window.location.assign(nextPath);
              }}
            >
              Continuer uniquement sur ce téléphone
            </Button>
            <p className="text-center text-sm leading-5 text-[var(--pc-color-text-muted)]">
              Sans compte et sans sauvegarde entre plusieurs appareils.
            </p>
          </div>

          {message ? (
            <div
              className="flex gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-color-success)] bg-[var(--pc-color-success-soft)] p-3 text-[length:var(--pc-font-size-secondary)] leading-5 text-[var(--pc-color-text)]"
              role="status"
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--pc-color-success)]"
                size={19}
              />
              <p>{message}</p>
            </div>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
        </section>
      </div>
    </main>
  );
}
