import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f7fb]">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Image src="/logo.png" alt="RS ÉCOLOGIE" width={320} height={114} className="h-16 w-auto object-contain" priority />
          </div>
          <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-8 shadow-[0_10px_30px_rgba(11,31,58,.10)]">
            <h1 className="text-2xl font-bold text-[#0b1f3a]">Choisir votre espace</h1>
            <p className="mt-1 text-sm text-[#64748b]">Connecté en tant que {user.email}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/admin"
                className={cn(buttonVariants(), "w-full justify-center")}
              >
                Espace administrateur
              </Link>
              <Link
                href="/telepro"
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
              >
                Espace télépro
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f7fb]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="RS ÉCOLOGIE" width={320} height={114} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-8 shadow-[0_10px_30px_rgba(11,31,58,.10)]">
          <h1 className="text-2xl font-bold text-[#0b1f3a]">Lead Manager</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Plateforme de gestion des leads pour téléprospection
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants(), "w-full justify-center")}
            >
              Se connecter
            </Link>
            <Link
              href="/setup"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
            >
              Première configuration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
