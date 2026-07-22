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
          ? "flex min-h-40 items-center justify-center py-2"
          : "flex min-h-24 items-center justify-start py-1",
        className,
      )}
    >
      {variant === "signature" ? (
        <LogoFull className="h-auto w-96 max-w-[92vw] shrink-0" priority />
      ) : (
        <LogoHorizontal className="h-20 w-auto max-w-[78vw] shrink-0" priority />
      )}
    </header>
  );
}
