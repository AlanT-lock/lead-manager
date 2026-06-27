import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { canSetup: null, error: "Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(url, key);
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (error) {
      return NextResponse.json(
        { canSetup: null, error: `Erreur base de données: ${error.message}` },
        { status: 500 }
      );
    }

    // En développement : FORCE_SETUP=true permet de réafficher le formulaire
    const forceSetup = process.env.FORCE_SETUP === "true";
    return NextResponse.json({
      canSetup: forceSetup ? true : count === 0,
      _debug: process.env.NODE_ENV === "development" ? { count, forceSetup } : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { canSetup: null, error: err instanceof Error ? err.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
