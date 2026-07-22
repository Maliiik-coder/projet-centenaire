import Image from "next/image";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function LogoMark({ className, priority = false }: LogoProps) {
  return (
    <Image
      alt="Haru"
      className={className ?? "h-16 w-auto"}
      height={952}
      priority={priority}
      src="/brand/haru-mark-heart-v2.png"
      width={955}
    />
  );
}

export function LogoHorizontal({ className, priority = false }: LogoProps) {
  return (
    <Image
      alt="Haru"
      className={className ?? "h-18 w-auto"}
      height={651}
      priority={priority}
      src="/brand/haru-wordmark-heart-v2.png"
      width={1544}
    />
  );
}

export function LogoFull({ className, priority = false }: LogoProps) {
  return (
    <span
      className={`inline-flex flex-col items-center justify-center ${
        className ?? "h-auto w-96"
      }`}
    >
      <LogoHorizontal className="h-auto w-full" priority={priority} />
      <span className="mt-1.5 text-center text-sm font-semibold text-[var(--pc-color-text-muted)]">
        Un jour à la fois.
      </span>
    </span>
  );
}
