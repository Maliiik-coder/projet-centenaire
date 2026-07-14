import Link from "next/link";
import { LogoHorizontal } from "@/components/Logo";

export default function OfflinePage() {
  return (
    <main className="app-screen">
      <section className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6">
        <LogoHorizontal
          markClassName="h-11 w-auto shrink-0 text-[#171512]"
          textClassName="whitespace-nowrap font-serif text-2xl leading-none text-[#171512]"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7166]">
          Hors connexion
        </p>
        <h1 className="font-serif text-4xl leading-tight">
          Le carnet reste local.
        </h1>
        <p className="leading-7 text-[#3A3732]">
          Les observations déjà enregistrées restent dans ce navigateur. Reviens à
          la page du jour dès que l’application est disponible.
        </p>
        <Link
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-[#171512] px-5 text-sm font-semibold text-[#F3EDE2] shadow-[0_10px_22px_rgba(23,21,18,0.16)] transition active:translate-y-px active:scale-[0.99]"
          href="/"
        >
          Retour à la page du jour
        </Link>
      </section>
    </main>
  );
}
