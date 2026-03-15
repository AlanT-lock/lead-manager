"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "Compte désactivé") {
      setError("Votre compte a été désactivé. Contactez l'administrateur.");
      setSuccess(null);
    } else if (msg === "Mot de passe modifié") {
      setError(null);
      setSuccess("Votre mot de passe a été modifié. Vous pouvez vous connecter.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabaseUrl =
      (typeof window !== "undefined" && (window as unknown as { __SUPABASE_ENV?: { url: string } }).__SUPABASE_ENV?.url) ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "";
    if (
      !supabaseUrl ||
      supabaseUrl.includes("xxxxx") ||
      supabaseUrl.includes("placeholder")
    ) {
      setError(
        "Configuration manquante : remplacez XXXXXXX dans .env.local par l’URL de votre projet Supabase (ex. https://abcdef.supabase.co), puis redémarrez le serveur (npm run dev) et rechargez la page."
      );
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      // Redirection complète pour que les cookies de session soient bien envoyés au serveur (Netlify/serverless)
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Load failed") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        setError(
          "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion internet et que .env.local contient NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY, puis redémarrez le serveur (npm run dev)."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Connexion
          </h1>
          <p className="text-slate-600 mb-6">
            Connectez-vous à votre espace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
            <p className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Mot de passe oublié ?
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="text-blue-600 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="text-slate-500">Chargement...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
