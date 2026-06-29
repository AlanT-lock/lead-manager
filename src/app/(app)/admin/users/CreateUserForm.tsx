"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateUserRole = "telepro" | "secretaire";

const INPUT_CLS =
  "w-full h-9 px-3 border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] transition-colors";
const LABEL_CLS = "block text-sm font-medium text-[#0b1f3a] mb-1.5";

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
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-[#0b1f3a]">Créer un utilisateur</h2>

      {error && (
        <div className="p-3 rounded-[9px] bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className={LABEL_CLS}>Nom complet</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as CreateUserRole)}
          className={INPUT_CLS}
        >
          <option value="telepro">Télépro</option>
          <option value="secretaire">Secrétaire</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-9 px-5 bg-[#2563eb] text-white text-sm font-medium rounded-[9px] hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
      >
        {loading ? "Création…" : `Créer le ${role === "telepro" ? "télépro" : "secrétaire"}`}
      </button>
    </form>
  );
}
