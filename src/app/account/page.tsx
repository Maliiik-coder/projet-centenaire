import { redirect } from "next/navigation";
import { AccountClient } from "@/app/account/AccountClient";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const configured = isSupabaseServerConfigured();
  const user = await getCurrentUser();

  if (configured && !user) {
    redirect("/login?next=/account");
  }

  return <AccountClient configured={configured} email={user?.email ?? null} />;
}
