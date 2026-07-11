export function safeAuthNext(next: string | null | undefined): string {
  if (!next) {
    return "/";
  }

  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
