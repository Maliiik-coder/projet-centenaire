import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "@/lib/supabase/server";
import { deleteUserApplicationData } from "@/services/cloudDataService";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    confirmation?: string;
  } | null;

  if (body?.confirmation !== "SUPPRIMER") {
    return NextResponse.json(
      { ok: false, error: "Confirmation invalide." },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase n'est pas configuré." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Session introuvable." },
      { status: 401 },
    );
  }

  await deleteUserApplicationData(supabase, user.id);

  const admin = getSupabaseAdminClient();
  let authDeleted = false;

  if (admin) {
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Les données sont supprimées, mais le compte Auth n'a pas pu l'être.",
        },
        { status: 500 },
      );
    }

    authDeleted = true;
  }

  return NextResponse.json({ ok: true, authDeleted });
}
