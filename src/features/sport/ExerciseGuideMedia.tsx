"use client";

import Image, { type StaticImageData } from "next/image";
import { BookOpen } from "lucide-react";
import bodyweightSquatControlledGuide from "@/features/sport/assets/bodyweight-squat-controlled-guide.png";
import bodyweightSquatDeeperGuide from "@/features/sport/assets/bodyweight-squat-deeper-guide.png";
import bodyweightSquatPartialGuide from "@/features/sport/assets/bodyweight-squat-partial-guide.png";
import plankFullGuide from "@/features/sport/assets/plank-full-guide.png";
import plankKneesGuide from "@/features/sport/assets/plank-knees-guide.png";
import plankWallGuide from "@/features/sport/assets/plank-wall-guide.png";
import pushFeetElevatedGuide from "@/features/sport/assets/push-feet-elevated-guide.png";
import pushKneesGuide from "@/features/sport/assets/push-knees-guide.png";
import pushStandardGuide from "@/features/sport/assets/push-standard-guide.png";
import pushWallGuide from "@/features/sport/assets/push-wall-guide.png";
import warmupMarchActiveGuide from "@/features/sport/assets/warmup-march-active-guide.png";
import warmupMarchEasyGuide from "@/features/sport/assets/warmup-march-easy-guide.png";
import { cx } from "@/components/ui/styles";
import type { ExerciseVariant } from "@/lib/sport/types";

const exerciseGuideImages: Partial<
  Record<string, { alt: string; src: StaticImageData }>
> = {
  push_wall: {
    alt: "Guide illustre des pompes au mur, avec position de depart, fin du mouvement et consignes.",
    src: pushWallGuide,
  },
  push_knees: {
    alt: "Guide illustre des pompes sur les genoux, avec position de depart, fin du mouvement et consignes.",
    src: pushKneesGuide,
  },
  push_standard: {
    alt: "Guide illustre des pompes classiques, avec position de depart, fin du mouvement et consignes.",
    src: pushStandardGuide,
  },
  push_feet_elevated: {
    alt: "Guide illustre des pompes pieds sureleves, avec position de depart, fin du mouvement et consignes.",
    src: pushFeetElevatedGuide,
  },
  bodyweight_squat_partial: {
    alt: "Guide illustre du demi-squat tres court, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatPartialGuide,
  },
  bodyweight_squat_controlled: {
    alt: "Guide illustre du demi-squat controle, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatControlledGuide,
  },
  bodyweight_squat_deeper: {
    alt: "Guide illustre du squat poids du corps adapte, avec position de depart, fin du mouvement et consignes.",
    src: bodyweightSquatDeeperGuide,
  },
  plank_wall: {
    alt: "Guide illustre du gainage face au mur, avec position et consignes.",
    src: plankWallGuide,
  },
  plank_knees: {
    alt: "Guide illustre du gainage sur les genoux, avec position et consignes.",
    src: plankKneesGuide,
  },
  plank_full: {
    alt: "Guide illustre du gainage classique, avec position et consignes.",
    src: plankFullGuide,
  },
  warmup_march_easy: {
    alt: "Guide illustre de la marche lente sur place, avec position de depart, mouvement et consignes.",
    src: warmupMarchEasyGuide,
  },
  warmup_march_active: {
    alt: "Guide illustre de la marche active sur place, avec position de depart, mouvement et consignes.",
    src: warmupMarchActiveGuide,
  },
};

export function hasExerciseGuideImage(variantId: string): boolean {
  return Boolean(exerciseGuideImages[variantId]);
}

export function AssessmentPoseStrip({ variantId }: { variantId: string }) {
  const guide = exerciseGuideImages[variantId];

  if (guide) {
    return (
      <figure className="grid gap-2">
        <div className="overflow-hidden rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]">
          <Image
            alt={guide.alt}
            className="h-auto w-full"
            placeholder="blur"
            priority={variantId === "push_wall"}
            sizes="(min-width: 640px) 46rem, calc(100vw - 2rem)"
            src={guide.src}
          />
        </div>
      </figure>
    );
  }

  return <NeutralIllustrationState />;
}

export function ExerciseGuideBlock({ variant }: { variant: ExerciseVariant }) {
  const guide = exerciseGuideImages[variant.id];

  if (!guide) {
    return <NeutralIllustrationState />;
  }

  return (
    <figure className="overflow-hidden rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]">
      <Image
        alt={guide.alt}
        className="h-auto w-full"
        placeholder="blur"
        sizes="(min-width: 640px) 46rem, calc(100vw - 2rem)"
        src={guide.src}
      />
    </figure>
  );
}

export function ExerciseGuideThumbnail({
  variantId,
}: {
  variantId?: string | null;
}) {
  const guide = variantId ? exerciseGuideImages[variantId] : undefined;

  if (!guide) {
    return <NeutralIllustrationState compact />;
  }

  return (
    <figure className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--pc-radius-card)] border border-[var(--pc-color-border)] bg-[var(--pc-color-surface)]">
      <Image
        alt={guide.alt}
        className="h-full w-full object-contain"
        placeholder="blur"
        sizes="4rem"
        src={guide.src}
      />
    </figure>
  );
}

function NeutralIllustrationState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cx(
        "grid place-items-center rounded-[var(--pc-radius-card)] border border-dashed border-[var(--pc-color-border)] bg-[var(--pc-color-surface-subtle)] p-4 text-center",
        compact ? "min-h-16 w-16 shrink-0 p-2" : "min-h-40",
      )}
    >
      <div>
        <BookOpen
          aria-hidden="true"
          className="mx-auto text-[var(--pc-color-primary)]"
          size={compact ? 18 : 24}
        />
        <p
          className={cx(
            "mt-2 font-semibold text-[var(--pc-color-text)]",
            compact && "sr-only",
          )}
        >
          Illustration a venir
        </p>
        {!compact ? (
          <p className="mt-1 text-sm leading-5 text-[var(--pc-color-text-muted)]">
            {"Aucun visuel valide n'est associe a cette variante pour l'instant."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
