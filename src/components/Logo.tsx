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
      src="/brand/Haru2.png"
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
      src="/brand/Haru.png"
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
      src="/brand/Haru3.png"
      width={739}
    />
  );
}
