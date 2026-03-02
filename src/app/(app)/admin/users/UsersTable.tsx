"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const telepros = users.filter((u) => u.role === "telepro");
  const secretaires = users.filter((u) => u.role === "secretaire");
  const admins = users.filter((u) => u.role === "admin");

  const handleDelete = async (telepro: User) => {
    if (!confirm(`Supprimer le télépro ${telepro.full_name || telepro.email} ?\n\nSes leads devront être redistribués.`)) return;
    setDeleting(telepro.id);
    const res = await fetch("/api/admin/delete-telepro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ teleproId: telepro.id }),
    });
    setDeleting(null);
    const data = await res.json();
    if (data.redirectTo) {
      router.push(data.redirectTo);
    } else if (res.ok) {
      router.refresh();
    } else {
      alert(data.error || "Erreur");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
              Nom
            </th>
            <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
              Email
            </th>
            <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
              Rôle
            </th>
            <th className="text-left py-4 px-4 text-sm font-medium text-slate-700 w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-4 px-4 font-medium">{u.full_name || "-"}</td>
              <td className="py-4 px-4 text-slate-600">{u.email}</td>
              <td className="py-4 px-4">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  Admin
                </span>
              </td>
              <td className="py-4 px-4" />
            </tr>
          ))}
          {secretaires.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-4 px-4 font-medium">{u.full_name || "-"}</td>
              <td className="py-4 px-4 text-slate-600">{u.email}</td>
              <td className="py-4 px-4">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                  Secrétaire
                </span>
              </td>
              <td className="py-4 px-4" />
            </tr>
          ))}
          {telepros.map((u) => (
            <tr key={u.id} className="border-b border-slate-100">
              <td className="py-4 px-4 font-medium">{u.full_name || "-"}</td>
              <td className="py-4 px-4 text-slate-600">{u.email}</td>
              <td className="py-4 px-4">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                  Télépro
                </span>
              </td>
              <td className="py-4 px-4">
                <button
                  type="button"
                  onClick={() => handleDelete(u)}
                  disabled={!!deleting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="Supprimer le télépro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
