import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Un administrateur existe déjà" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || "",
        role: "admin",
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.user) {
      // Upsert pour forcer le rôle admin (le trigger peut avoir créé avec "telepro")
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            email: data.user.email ?? email,
            full_name: fullName || email,
            role: "admin",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
