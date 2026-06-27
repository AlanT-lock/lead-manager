"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

interface Telepro {
  id: string;
  full_name: string | null;
  email: string;
}

interface CsvImportFormProps {
  telepros: Telepro[];
}

export function CsvImportForm({ telepros }: CsvImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTelepros, setSelectedTelepros] = useState<Set<string>>(
    new Set(telepros.map((t) => t.id))
  );
  const [teleproPercentages, setTeleproPercentages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported?: number;
    errors?: number;
    details?: string[];
    error?: string;
  } | null>(null);
  const router = useRouter();

  const toggleTelepro = (id: string) => {
    setSelectedTelepros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setTeleproPercentages((p) => {
          const copy = { ...p };
          delete copy[id];
          return copy;
        });
      } else {
        next.add(id);
      }
      return next;
    });
    setValidationError(null);
  };

  const setPercentage = (id: string, value: string) => {
    setTeleproPercentages((prev) => ({ ...prev, [id]: value }));
    setValidationError(null);
  };

  const selectedList = Array.from(selectedTelepros);
  const hasAnyPercentage = selectedList.some((id) => {
    const v = teleproPercentages[id]?.trim();
    return v !== "" && v !== undefined;
  });

  const validatePercentages = (): Record<string, number> | null => {
    if (!hasAnyPercentage) return null;
    const percentages: Record<string, number> = {};
    let sum = 0;
    for (const id of selectedList) {
      const raw = teleproPercentages[id]?.trim() ?? "";
      const num = parseFloat(raw.replace(",", "."));
      if (raw === "" || isNaN(num) || num < 0 || num > 100) {
        return null;
      }
      percentages[id] = num;
      sum += num;
    }
    if (Math.abs(sum - 100) > 0.01) return null;
    return percentages;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!file || selectedTelepros.size === 0) return;

    const validatedPercentages = validatePercentages();
    if (hasAnyPercentage && !validatedPercentages) {
      const sum = selectedList.reduce((s, id) => {
        const raw = teleproPercentages[id]?.trim() ?? "";
        const num = parseFloat(raw.replace(",", "."));
        return s + (isNaN(num) ? 0 : num);
      }, 0);
      setValidationError(
        sum === 0
          ? "Si vous utilisez les pourcentages, chaque télépro doit avoir un pourcentage renseigné."
          : `La somme des pourcentages doit être exactement 100% (actuellement ${sum.toFixed(1)}%).`
      );
      return;
    }

    setLoading(true);
    setResult(null);

    const text = await file.text();
    const firstLine = text.split("\n")[0] ?? "";
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const delimiter = tabCount > commaCount ? "\t" : ",";
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
    });

    const res = await fetch("/api/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        rows: parsed.data,
        teleproIds: selectedList,
        teleproPercentages: validatedPercentages ?? undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);
    setResult(data);
    router.refresh();

    if (data.error) {
      setValidationError(data.error);
    } else if (data.imported > 0) {
      setFile(null);
    }
  };

  const columnMapping: Record<string, string> = {
    first_name: "Prénom",
    last_name: "Nom",
    phone: "Téléphone",
    email: "Email",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">
          Fichier CSV (format Meta Ads)
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Le fichier doit contenir des colonnes pour le prénom, nom (ou nom complet), téléphone
          et email. Formats supportés : first_name/last_name, full name (Meta Ads), prénom/nom,
          phone_number, email. D&apos;autres variantes sont détectées automatiquement.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">
          Télépros à qui attribuer les leads
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Désélectionnez les télépros absents pour ne pas leur attribuer de
          leads. Optionnel : renseignez un pourcentage pour chaque télépro pour
          répartir les leads proportionnellement. Si aucun pourcentage n&apos;est
          renseigné, la répartition est équitable.
        </p>
        {telepros.length === 0 ? (
          <p className="text-amber-600">
            Aucun télépro. Créez des comptes télépro depuis l&apos;espace admin.
          </p>
        ) : (
          <div className="space-y-2">
            {telepros.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  selectedTelepros.has(t.id) ? "hover:bg-slate-50" : "opacity-60"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectedTelepros.has(t.id)}
                    onChange={() => toggleTelepro(t.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="font-medium">
                    {t.full_name || t.email}
                  </span>
                  <span className="text-sm text-slate-500">{t.email}</span>
                </label>
                {selectedTelepros.has(t.id) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="%"
                      value={teleproPercentages[t.id] ?? ""}
                      onChange={(e) => setPercentage(t.id, e.target.value)}
                      className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {hasAnyPercentage && (
          <p className="text-sm text-amber-600 mt-2">
            La somme des pourcentages doit être exactement 100%.
          </p>
        )}
      </div>

      {validationError && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
          <p className="font-medium">{validationError}</p>
        </div>
      )}

      {result && !result.error && result.imported !== undefined && (
        <div
          className={`p-4 rounded-lg ${
            (result.errors ?? 0) > 0 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
          }`}
        >
          <p className="font-medium">
            {result.imported} lead(s) importé(s)
            {(result.errors ?? 0) > 0 && `, ${result.errors} erreur(s)`}
          </p>
          {result.details && result.details.length > 0 && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {result.details.slice(0, 10).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
              {result.details.length > 10 && (
                <li>... et {result.details.length - 10} autres</li>
              )}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !file || selectedTelepros.size === 0}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Import en cours..." : "Importer"}
      </button>
    </form>
  );
}
