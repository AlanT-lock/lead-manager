"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Calendar, Camera, Check, ChevronDown, Link2, MapPin, Phone, Plus, RotateCcw, UserX, X } from "lucide-react";
import { SavForm } from "@/components/sav/SavForm";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/compress-image";
import { formatFullDateTimeParis, fromDatetimeLocalValueParis } from "@/lib/date";
import {
  SAV_PUBLIC_PATH,
  SAV_STATUSES,
  SAV_STATUS_COLORS,
  SAV_STATUS_LABELS,
  type SavRequestWithUrls,
  type SavStatus,
} from "@/lib/sav";

// Leaflet touche `window` : la carte n'est rendue que côté navigateur.
const SavMap = dynamic(() => import("./SavMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[12px] bg-[#e1e8f2]" />,
});

type Filter = "all" | SavStatus;

function StatusBadge({ status }: { status: SavStatus }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${SAV_STATUS_COLORS[status]}1a`, color: SAV_STATUS_COLORS[status] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SAV_STATUS_COLORS[status] }} />
      {SAV_STATUS_LABELS[status]}
    </span>
  );
}

export function SavClient({ initialItems }: { initialItems: SavRequestWithUrls[] }) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const s of SAV_STATUSES) c[s] = items.filter((i) => i.status === s).length;
    return c;
  }, [items]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  const replaceItem = (updated: SavRequestWithUrls) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  const selectFromMap = (id: string) => {
    // Si le SAV est masqué par le filtre, on l'affiche pour que la fiche s'ouvre.
    setFilter((f) => (f === "all" || items.find((i) => i.id === id)?.status === f ? f : "all"));
    setExpandedId(id);
  };

  useEffect(() => {
    if (expandedId) rowRefs.current[expandedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [expandedId]);

  const copyLink = async () => {
    const url = `${window.location.origin}${SAV_PUBLIC_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien du formulaire client copié");
    } catch {
      window.prompt("Copiez le lien du formulaire client :", url);
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    ...SAV_STATUSES.map((s) => ({ key: s as Filter, label: SAV_STATUS_LABELS[s] })),
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"} size="lg">
            {showForm ? <X /> : <Plus />}
            {showForm ? "Fermer le formulaire" : "Nouveau SAV"}
          </Button>
          <Button onClick={copyLink} variant="outline" size="lg" title="Lien unique à envoyer à vos clients">
            <Link2 />
            Copier le lien client
          </Button>
        </div>

        {showForm && (
          <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#0b1f3a]">Nouvelle demande de SAV</h2>
            <SavForm
              endpoint="/api/admin/sav"
              submitLabel="Enregistrer le SAV"
              onSuccess={(created) => {
                const sav = created as SavRequestWithUrls;
                setItems((prev) => [sav, ...prev]);
                setShowForm(false);
                setExpandedId(sav.id);
                toast.success("SAV enregistré");
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-[#e1e8f2] bg-white text-[#475569] hover:bg-[#f4f7fb]"
              }`}
            >
              {f.label} <span className="tabular-nums opacity-80">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visible.length === 0 && (
            <p className="rounded-[12px] border border-dashed border-[#d5deec] bg-white p-8 text-center text-sm text-[#64748b]">
              {items.length === 0 ? "Aucune demande de SAV pour le moment." : "Aucune demande dans cette catégorie."}
            </p>
          )}
          {visible.map((item) => (
            <div
              key={item.id}
              ref={(el) => {
                rowRefs.current[item.id] = el;
              }}
            >
              <SavCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
                onUpdated={replaceItem}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Carte fixe : seule la colonne de gauche défile (sticky sur grand écran). */}
      <div className="h-80 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <div className="h-full overflow-hidden rounded-[12px] border border-[#e1e8f2] bg-white shadow-sm">
          <SavMap items={visible} selectedId={expandedId} onSelect={selectFromMap} />
        </div>
      </div>
    </div>
  );
}

function SavCard({
  item,
  expanded,
  onToggle,
  onUpdated,
}: {
  item: SavRequestWithUrls;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (item: SavRequestWithUrls) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [when, setWhen] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);

  const updateStatus = async (status: SavStatus, rescheduledAt?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sav/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rescheduled_at: rescheduledAt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      onUpdated(json);
      setRescheduling(false);
      toast.success(`SAV : ${SAV_STATUS_LABELS[status].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const body = new FormData();
      const files = await Promise.all(Array.from(list).map((f) => compressImage(f)));
      files.forEach((f) => body.append("photos", f));
      const res = await fetch(`/api/admin/sav/${item.id}/photos`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      onUpdated(json);
      toast.success("Photo(s) ajoutée(s)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-[12px] border bg-white shadow-sm transition-colors ${
        expanded ? "border-[#2563eb]" : "border-[#e1e8f2]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f8fafd]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[#0b1f3a]">{item.name}</span>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-0.5 text-sm text-[#475569]">
            {item.problem_type} · {item.phone}
          </div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#64748b]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.address}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-[#64748b]">
          <span>{formatFullDateTimeParis(item.created_at)}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-[#e1e8f2] bg-[#fbfcfe] px-4 py-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Info label="Nom" value={item.name} />
            <Info
              label="Téléphone"
              value={
                <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 text-[#2563eb] hover:underline">
                  <Phone className="h-3.5 w-3.5" />
                  {item.phone}
                </a>
              }
            />
            <Info
              label="Email"
              value={
                item.email ? (
                  <a href={`mailto:${item.email}`} className="text-[#2563eb] hover:underline">
                    {item.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Info label="Type de problème" value={item.problem_type} />
            <div className="sm:col-span-2">
              <Info label="Adresse de l'intervention" value={item.address} />
            </div>
            <div className="sm:col-span-2">
              <Info label="Description" value={<p className="whitespace-pre-wrap">{item.description}</p>} />
            </div>
            <Info label="Reçu" value={`${formatFullDateTimeParis(item.created_at)} · ${item.source === "client" ? "formulaire client" : "saisie interne"}`} />
            {item.status === "a_reprogrammer" && item.rescheduled_at && (
              <Info label="Reprogrammé le" value={formatFullDateTimeParis(item.rescheduled_at)} />
            )}
          </dl>

          {item.photo_urls.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#64748b]">
                Photos ({item.photo_urls.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {item.photo_urls.map((url, i) =>
                  url ? (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-lg border border-[#e1e8f2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}

          {rescheduling && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3">
              <label className="text-sm font-medium text-[#0b1f3a]">
                Nouvelle date et heure
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="mt-1 block h-9 rounded-lg border border-[#e1e8f2] bg-white px-2 text-sm"
                />
              </label>
              <Button
                size="lg"
                disabled={!when || busy}
                onClick={() => updateStatus("a_reprogrammer", fromDatetimeLocalValueParis(when))}
              >
                <Check /> Valider
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setRescheduling(false)}>
                Annuler
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#e1e8f2] pt-4">
            <Button size="lg" disabled={busy || item.status === "resolu"} onClick={() => updateStatus("resolu")} className="bg-[#16a34a] text-white hover:bg-[#15803d]">
              <Check /> Résolu
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => setRescheduling((v) => !v)}>
              <Calendar /> À reprogrammer
            </Button>
            <Button size="lg" variant="outline" disabled={busy || item.status === "absent"} onClick={() => updateStatus("absent")}>
              <UserX /> Absent
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => photoInput.current?.click()}>
              <Camera /> Ajouter une photo
            </Button>
            {item.status !== "a_traiter" && (
              <Button size="lg" variant="ghost" disabled={busy} onClick={() => updateStatus("a_traiter")}>
                <RotateCcw /> Remettre à traiter
              </Button>
            )}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => void addPhotos(e.target.files)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[#64748b]">{label}</dt>
      <dd className="mt-0.5 text-[#0b1f3a]">{value}</dd>
    </div>
  );
}
