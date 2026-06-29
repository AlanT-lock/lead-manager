"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";

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
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
        <div className="text-[#64748b]">Vérification du lien...</div>
      </div>
    );
  }

  if (error && !password) {
    return (
      <AuthShell
        title="Lien invalide"
        footer={
          <Link href="/login" className="text-[#2563eb] hover:underline">
            Retour à la connexion
          </Link>
        }
      >
        <p className="mb-6 text-sm text-[#64748b]">{error}</p>
        <Link href="/forgot-password" className={cn(buttonVariants(), "w-full justify-center")}>
          Demander un nouveau lien
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe (minimum 6 caractères)"
      footer={
        <Link href="/login" className="text-[#2563eb] hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-[9px] bg-[#fee2e2] px-3 py-2 text-sm text-[#b91c1c]">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[#0b1f3a]">
            Nouveau mot de passe
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-[#0b1f3a]">
            Confirmer le mot de passe
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Enregistrement..." : "Réinitialiser le mot de passe"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
          <div className="text-[#64748b]">Chargement...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
