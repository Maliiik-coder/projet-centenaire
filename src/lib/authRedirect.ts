export function safeAuthNext(next: string | null | undefined): string {
  if (!next) {
    return "/";
  }

  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function normalizeOrigin(origin: string | null | undefined): string | null {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function getAppOrigin(fallbackOrigin?: string): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(fallbackOrigin) ??
    "http://localhost:3000"
  );
}

export function buildAuthCallbackUrl(
  next: string | null | undefined,
  fallbackOrigin?: string,
): string {
  const url = new URL("/auth/callback", getAppOrigin(fallbackOrigin));
  url.searchParams.set("next", safeAuthNext(next));

  return url.toString();
}
