"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canSetup, setCanSetup] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const router = useRouter();

  const runCheck = async () => {
    setCheckError(null);
    setCanSetup(null);
    try {
      const res = await fetch("/api/setup/check");
      const text = await res.text();
      let data: { canSetup?: boolean; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setCheckError(
          res.ok
            ? "Réponse serveur invalide"
            : `Erreur ${res.status}: ${text.slice(0, 200)}`
        );
        return;
      }
      if (data.error) {
        setCheckError(data.error);
      } else {
        setCanSetup(data.canSetup ?? null);
      }
    } catch (err) {
      const msg =
        err instanceof TypeError && err.message?.includes("fetch")
          ? "Serveur inaccessible. Lancez 'npm run dev' dans le dossier lead-manager."
          : err instanceof Error
          ? err.message
          : "Erreur inconnue";
      setCheckError(msg);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      const text = await res.text();
      let data: { error?: string; success?: boolean };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? "Réponse invalide" : `Erreur ${res.status}`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }

      router.refresh();
      router.push("/login");
    } catch (err) {
      setLoading(false);
      const msg =
        err instanceof TypeError && (err.message?.includes("fetch") || err.message?.includes("Failed"))
          ? "Impossible de joindre le serveur. Vérifiez que 'npm run dev' est lancé (vous êtes sur le port 3001)."
          : err instanceof Error
          ? err.message
          : "Erreur de connexion";
      setError(msg);
    }
  };

  if (canSetup === null && !checkError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Chargement...</div>
      </div>
    );
  }

  if (checkError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-800 mb-4">
            Erreur de vérification
          </h1>
          <p className="text-slate-600 mb-4 text-sm">{checkError}</p>
          <p className="text-slate-500 text-sm mb-6">
            Vérifiez que la migration Supabase a été exécutée et que les variables d&apos;environnement sont correctes dans .env.local
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={runCheck}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Réessayer
            </button>
            <button
              onClick={() => {
                setCheckError(null);
                setCanSetup(true);
              }}
              className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Continuer quand même (créer un admin)
            </button>
          </div>
          <Link
            href="/"
            className="block mt-4 text-blue-600 hover:underline text-sm"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!canSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-4">
            Configuration déjà effectuée
          </h1>
          <p className="text-slate-600 mb-6">
            Un administrateur existe déjà. Utilisez la page de connexion.
          </p>
          <Link
            href="/login"
            className="inline-block py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Première configuration
          </h1>
          <p className="text-slate-600 mb-6">
            Créez le compte administrateur
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
                minLength={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Création..." : "Créer le compte admin"}
            </button>
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
