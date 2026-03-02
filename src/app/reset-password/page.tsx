"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;

    const checkSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
          setError(null);
        } else if (!hasHash) {
          setError("Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.");
          setReady(true);
        }
      });
    };

    checkSession();
    if (hasHash) {
      const timer = setTimeout(checkSession, 500);
      const timeout = setTimeout(() => {
        setReady((r) => {
          if (!r) {
            setError("Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.");
          }
          return true;
        });
      }, 3000);
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkSession());
      return () => {
        clearTimeout(timer);
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login?message=Mot de passe modifié";
  };

  if (!ready && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="text-slate-500">Vérification du lien...</div>
      </div>
    );
  }

  if (error && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Lien invalide
            </h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/forgot-password"
              className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-center transition-colors"
            >
              Demander un nouveau lien
            </Link>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/login" className="text-blue-600 hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-slate-600 mb-6">
            Choisissez un nouveau mot de passe (minimum 6 caractères)
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Nouveau mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Enregistrement..." : "Réinitialiser le mot de passe"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="text-blue-600 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
          <div className="text-slate-500">Chargement...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
