import { LogoFull, LogoHorizontal } from "@/components/Logo";
import { cx } from "@/components/ui/styles";

export type AppHeaderProps = {
  className?: string;
  variant?: "signature" | "wordmark";
};

export function AppHeader({
  className,
  variant = "wordmark",
}: AppHeaderProps) {
  return (
    <header
      className={cx(
        variant === "signature"
          ? "flex min-h-24 items-center justify-center py-2"
          : "flex min-h-14 items-center justify-center py-1",
        className,
      )}
    >
      {variant === "signature" ? (
        <LogoFull className="h-auto w-52 max-w-[72vw] shrink-0" priority />
      ) : (
        <LogoHorizontal className="h-10 w-auto max-w-[52vw] shrink-0" priority />
      )}
    </header>
  );
}
