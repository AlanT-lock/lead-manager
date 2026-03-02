import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let profile: { role?: string } | null = null;
    try {
      const adminClient = createAdminClient();
      const res = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = res.data;
    } catch {
      const res = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = res.data;
    }

    const role = profile?.role?.toString().trim().toLowerCase();
    if (role === "admin") {
      redirect("/admin");
    }
    if (role === "secretaire") {
      redirect("/admin/documents-recus");
    }
    if (role === "telepro") {
      redirect("/telepro");
    }
    // Rôle inconnu ou profil introuvable : afficher les deux accès
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">
            Choisir votre espace
          </h1>
          <p className="text-slate-600">
            Connecté en tant que {user.email}
          </p>
          <div className="flex flex-col gap-4">
            <Link
              href="/admin"
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Espace administrateur
            </Link>
            <Link
              href="/telepro"
              className="w-full py-3 px-6 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Espace télépro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800">
          Lead Manager
        </h1>
        <p className="text-slate-600">
          Plateforme de gestion des leads pour téléprospection
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/setup"
            className="w-full py-3 px-6 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Première configuration
          </Link>
        </div>
      </div>
    </div>
  );
}
