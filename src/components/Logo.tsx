type LogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function LogoMark({
  className,
  title = "Projet Centenaire",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      aria-label={title}
      className={className}
      fill="none"
      role="img"
      viewBox="152 96 252 320"
    >
      <path
        d="M256 116 V396"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M316 132 C276 103 218 107 181 144 C128 197 128 315 181 368 C218 405 276 409 316 380"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <path
        d="M348 161 C376 194 386 239 378 282"
        stroke="var(--pc-logo-accent, #8C857A)"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <circle cx="256" cy="256" fill="currentColor" r="11" />
      <circle cx="276" cy="134" fill="currentColor" r="2.5" />
      <circle cx="297" cy="143" fill="currentColor" r="3" />
      <circle cx="316" cy="157" fill="currentColor" r="3.8" />
      <circle cx="333" cy="176" fill="currentColor" r="4.6" />
      <circle cx="346" cy="199" fill="currentColor" r="5.3" />
      <circle cx="356" cy="225" fill="currentColor" r="6" />
    </svg>
  );
}

export function LogoHorizontal({
  className,
  markClassName,
  textClassName,
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark
        className={markClassName ?? "size-8 text-[#171512]"}
        title="Projet Centenaire"
      />
      <span className={textClassName ?? "font-serif text-xl text-[#171512]"}>
        Projet Centenaire
      </span>
    </div>
  );
}

export function LogoFull({
  className,
  markClassName,
  textClassName,
}: LogoProps) {
  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className ?? ""}`}>
      <LogoMark
        className={markClassName ?? "size-20 text-[#171512]"}
        title="Projet Centenaire"
      />
      <span className={textClassName ?? "font-serif text-3xl text-[#171512]"}>
        Projet Centenaire
      </span>
    </div>
  );
}
