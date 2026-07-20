export const ADMIN_PREVIEW_ENV_NAME = "HARU_ADMIN_PREVIEW_ENABLED";

interface AdminPreviewAccessInput {
  environment: string | undefined;
  enabledFlag: string | undefined;
}

export function canRenderAdminPreview({
  environment,
  enabledFlag,
}: AdminPreviewAccessInput): boolean {
  if (environment !== "production") {
    return true;
  }

  return enabledFlag === "true";
}
