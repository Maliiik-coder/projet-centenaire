import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BackButton, buttonClassName, TopBar } from "@/components/ui";

export default function OfflinePage() {
  return (
    <main className="pc-screen">
      <div className="pc-screen-inner flex flex-col">
        <TopBar label="Hors connexion" />
        <section className="flex flex-1 flex-col items-start justify-center gap-5 py-10">
          <BackButton label="Retour à la page précédente" />
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-primary-soft)] text-[var(--pc-color-primary)]"
          >
            <WifiOff size={24} />
          </span>
          <div className="space-y-3">
            <h1 className="max-w-sm text-[length:var(--pc-font-size-page-title)] leading-[var(--pc-line-height-tight)] font-bold text-[var(--pc-color-text)]">
              Le carnet reste local.
            </h1>
            <p className="max-w-md text-[length:var(--pc-font-size-body)] leading-[var(--pc-line-height-relaxed)] text-[var(--pc-color-text-muted)]">
              Les observations déjà enregistrées restent dans ce navigateur. Reviens
              à la page du jour dès que l’application est disponible.
            </p>
          </div>
          <Link className={buttonClassName()} href="/">
            Retour à la page du jour
          </Link>
        </section>
      </div>
    </main>
  );
}
