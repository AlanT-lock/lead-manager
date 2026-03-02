"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateUserRole = "telepro" | "secretaire";

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<CreateUserRole>("telepro");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, fullName, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Une erreur est survenue");
      return;
    }

    setEmail("");
    setPassword("");
    setFullName("");
    setRole("telepro");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <h2 className="font-medium text-slate-800">Créer un utilisateur</h2>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nom complet
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Rôle
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as CreateUserRole)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="telepro">Télépro</option>
          <option value="secretaire">Secrétaire</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Création..." : `Créer le ${role === "telepro" ? "télépro" : "secrétaire"}`}
      </button>
    </form>
  );
}
