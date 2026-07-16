import type { ReactNode } from "react";
import { cx } from "@/components/ui/styles";

type IllustrationKind =
  | "push-wall"
  | "push-knees"
  | "push-standard"
  | "push-elevated"
  | "squat"
  | "hinge"
  | "bridge"
  | "dead-bug"
  | "plank"
  | "bird-dog"
  | "march"
  | "shoulders"
  | "pull"
  | "carry"
  | "generic";

function resolveKind(exerciseId?: string | null, variantId?: string | null): IllustrationKind {
  if (variantId === "push_wall") {
    return "push-wall";
  }

  if (variantId === "push_knees") {
    return "push-knees";
  }

  if (variantId === "push_standard") {
    return "push-standard";
  }

  if (variantId === "push_feet_elevated") {
    return "push-elevated";
  }

  if (variantId?.startsWith("plank_")) {
    return variantId === "plank_wall" ? "push-wall" : "plank";
  }

  if (exerciseId === "bodyweight_squat" || exerciseId === "sit_to_stand") {
    return "squat";
  }

  if (exerciseId === "hip_hinge") {
    return "hinge";
  }

  if (exerciseId === "glute_bridge") {
    return "bridge";
  }

  if (exerciseId === "dead_bug") {
    return "dead-bug";
  }

  if (exerciseId === "bird_dog") {
    return "bird-dog";
  }

  if (exerciseId === "warmup_march") {
    return "march";
  }

  if (exerciseId === "mobility_shoulders") {
    return "shoulders";
  }

  if (exerciseId === "band_row") {
    return "pull";
  }

  if (exerciseId === "farmer_carry") {
    return "carry";
  }

  return "generic";
}

function Head({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} fill="var(--pc-color-surface)" r="5.5" />;
}

function Floor() {
  return (
    <path
      d="M14 72h92"
      stroke="currentColor"
      strokeLinecap="round"
      strokeOpacity="0.32"
      strokeWidth="3"
    />
  );
}

function renderFigure(kind: IllustrationKind): ReactNode {
  switch (kind) {
    case "push-wall":
      return (
        <>
          <path d="M92 16v57" strokeOpacity="0.32" strokeWidth="4" />
          <Head x={53} y={31} />
          <path d="M58 38l22 18M69 47l22-7M70 49l21 9M78 56l-13 16M78 56l18 15" />
        </>
      );
    case "push-knees":
      return (
        <>
          <Floor />
          <Head x={43} y={44} />
          <path d="M49 48l31 12M53 51L43 71M58 53l-2 18M80 60l-16 12M80 60l19 10" />
          <path d="M63 72h15" strokeOpacity="0.32" strokeWidth="4" />
        </>
      );
    case "push-standard":
      return (
        <>
          <Floor />
          <Head x={32} y={48} />
          <path d="M38 51l48 9M45 53l-7 19M56 55l-2 17M86 60l-11 12M86 60l18 12" />
        </>
      );
    case "push-elevated":
      return (
        <>
          <Floor />
          <path d="M86 58h18v14H86z" fill="var(--pc-color-surface)" strokeOpacity="0.32" />
          <Head x={33} y={47} />
          <path d="M39 50l47 2M47 50l-8 22M58 51l-3 21M86 52l8 6M86 52l15 6" />
        </>
      );
    case "squat":
      return (
        <>
          <Floor />
          <Head x={61} y={28} />
          <path d="M61 34l-8 22M54 55l-17 17M54 55l25 17M58 42l-18 8M59 43l22 6" />
        </>
      );
    case "hinge":
      return (
        <>
          <Floor />
          <Head x={49} y={27} />
          <path d="M54 34l28 18M82 52l-7 20M82 52l18 20M63 40l-20 18" />
        </>
      );
    case "bridge":
      return (
        <>
          <Floor />
          <Head x={30} y={61} />
          <path d="M36 61l27-16l25 18M88 63l10 9M63 45l-9 27M38 72h66" />
        </>
      );
    case "dead-bug":
      return (
        <>
          <Floor />
          <Head x={36} y={60} />
          <path d="M42 61l33 2M56 60l-12-23M61 61l8-25M73 63l17-20M74 63l19 9" />
        </>
      );
    case "plank":
      return (
        <>
          <Floor />
          <Head x={36} y={51} />
          <path d="M42 54l43 8M50 55l-12 17M58 57l-6 15M85 62l-14 10M85 62l18 10" />
        </>
      );
    case "bird-dog":
      return (
        <>
          <Floor />
          <Head x={43} y={45} />
          <path d="M49 50l32 8M53 52l-23-12M62 54l-5 18M78 57l4 15M81 58l24-11" />
        </>
      );
    case "march":
      return (
        <>
          <Floor />
          <Head x={60} y={24} />
          <path d="M60 30v28M60 42l-18-12M60 43l19 13M60 58l-16 14M60 58l18-21" />
        </>
      );
    case "shoulders":
      return (
        <>
          <Head x={60} y={27} />
          <path d="M60 34v30M60 42l-23 4M60 42l23 4M42 45a9 9 0 1 0-1 1M78 45a9 9 0 1 1 1 1M50 64h20" />
        </>
      );
    case "pull":
      return (
        <>
          <Floor />
          <path d="M94 31v41" strokeOpacity="0.32" strokeWidth="4" />
          <Head x={53} y={29} />
          <path d="M54 35l-5 37M51 48l32-14M54 49l28 7M49 72h24" />
          <path d="M83 34l11 10M82 56l12-12" strokeOpacity="0.55" />
        </>
      );
    case "carry":
      return (
        <>
          <Floor />
          <Head x={58} y={24} />
          <path d="M58 30v31M58 44l-17 13M58 44l19 12M58 61l-12 11M58 61l17 11" />
          <path d="M35 58h10v10H35zM76 58h10v10H76z" fill="var(--pc-color-surface)" strokeOpacity="0.42" />
        </>
      );
    default:
      return (
        <>
          <Floor />
          <Head x={60} y={26} />
          <path d="M60 32v30M60 43l-19 13M60 43l20 13M60 62l-13 10M60 62l16 10" />
        </>
      );
  }
}

export function ExerciseIllustration({
  className,
  exerciseId,
  label,
  variantId,
}: {
  className?: string;
  exerciseId?: string | null;
  label?: string;
  variantId?: string | null;
}) {
  const kind = resolveKind(exerciseId, variantId);

  return (
    <div
      className={cx(
        "flex aspect-[4/3] min-h-16 items-center justify-center rounded-[var(--pc-radius-card)] bg-[var(--pc-color-surface-subtle)] text-[var(--pc-color-primary)]",
        className,
      )}
    >
      <svg
        aria-label={label ?? "Illustration du mouvement"}
        className="h-full w-full"
        fill="none"
        role="img"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
        viewBox="0 0 120 90"
      >
        <rect
          fill="var(--pc-color-surface)"
          height="76"
          opacity="0.55"
          rx="10"
          width="106"
          x="7"
          y="7"
        />
        <g>{renderFigure(kind)}</g>
      </svg>
    </div>
  );
}
