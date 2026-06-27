"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";

const DOC_TYPES = [
  { value: "devis", label: "Devis", canUpload: true },
  { value: "facture", label: "Facture", canUpload: true },
  { value: "facture_materiel", label: "Facture matériel", canUpload: true },
  { value: "facture_sous_traitant", label: "Facture sous-traitant", canUpload: true },
  { value: "taxe_fonciere", label: "Taxe foncière (télépro)", canUpload: false },
  { value: "avis_imposition", label: "Avis d'imposition (télépro)", canUpload: false },
] as const;

interface Doc {
  id: string;
  type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
}

interface DocumentsSectionProps {
  leadId: string;
  documents: Doc[];
}

export function DocumentsSection({ leadId, documents: initialDocs }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState(initialDocs);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const type = (e.target.dataset.type || "devis") as string;
    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} dépasse 5 Mo`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("leadId", leadId);
      formData.append("type", type);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur lors de l'upload");
      } else if (data.document) {
        setDocuments((d) => [...d, data.document]);
      }
    }

    setUploading(false);
    e.target.value = "";
    router.refresh();
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm("Supprimer ce document ?")) return;

    const res = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: doc.id, storagePath: doc.storage_path }),
    });

    if (res.ok) {
      setDocuments((d) => d.filter((x) => x.id !== doc.id));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Erreur lors de la suppression");
    }
  };

  const getDocUrl = (path: string) => {
    return `/api/documents?path=${encodeURIComponent(path)}`;
  };

  const groupedDocs = DOC_TYPES.map(({ value, label, canUpload }) => ({
    value,
    label,
    canUpload,
    docs: documents.filter((d) => d.type === value),
  }));

  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="font-medium text-slate-800 mb-4">Documents</h2>
      <div className="space-y-6">
        {groupedDocs.map(({ value, label, canUpload, docs }) => (
          <div key={value}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">{label}</h3>
              {canUpload && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    data-type={value}
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span className="text-sm text-blue-600 hover:underline">
                    + Ajouter
                  </span>
                </label>
              )}
            </div>
            <div className="space-y-2">
              {docs.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun document</p>
              ) : (
                docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <a
                      href={getDocUrl(doc.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      {doc.file_name}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
