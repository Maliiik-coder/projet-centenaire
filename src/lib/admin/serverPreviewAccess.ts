import "server-only";

import { canRenderAdminPreview } from "./previewAccessPolicy";

export function isAdminPreviewEnabled(): boolean {
  return canRenderAdminPreview({
    environment: process.env.NODE_ENV,
    enabledFlag: process.env.HARU_ADMIN_PREVIEW_ENABLED,
  });
}
