import { HealthClient, type HealthStatus } from "./HealthClient";

export const dynamic = "force-dynamic";

function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export default function HealthPage() {
  const status: HealthStatus = {
    version: "V0.7.1",
    environment: process.env.NODE_ENV ?? "development",
    supabaseUrlConfigured: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyConfigured: isConfigured(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    serviceRoleConfigured: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    appleOAuthEnabled: process.env.NEXT_PUBLIC_ENABLE_APPLE_OAUTH === "true",
    pwaManifestPresent: true,
  };

  return <HealthClient status={status} />;
}
