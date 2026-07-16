import Image from "next/image";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function LogoMark({ className, priority = false }: LogoProps) {
  return (
    <Image
      alt="Haru"
      className={className ?? "h-8 w-auto"}
      height={335}
      priority={priority}
      src="/brand/haru-mark-7px.png"
      width={433}
    />
  );
}

export function LogoHorizontal({ className, priority = false }: LogoProps) {
  return (
    <Image
      alt="Haru"
      className={className ?? "h-9 w-auto"}
      height={322}
      priority={priority}
      src="/brand/haru-wordmark-7px.png"
      width={1112}
    />
  );
}

export function LogoFull({ className, priority = false }: LogoProps) {
  return (
    <Image
      alt="Haru, un jour à la fois."
      className={className ?? "h-auto w-52"}
      height={357}
      priority={priority}
      src="/brand/haru-full-7px.png"
      width={739}
    />
  );
}
