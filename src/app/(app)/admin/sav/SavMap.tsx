"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate } from "lucide-react";
import { SAV_STATUS_COLORS, type SavRequest } from "@/lib/sav";

const FRANCE_CENTER: L.LatLngTuple = [46.6, 2.4];
const FRANCE_ZOOM = 6;

interface Props {
  items: SavRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Carte de France : un point par SAV géolocalisé, coloré selon son statut. */
export default function SavMap({ items, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: FRANCE_CENTER, zoom: FRANCE_ZOOM, zoomSnap: 0.5 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // La carte vit dans un conteneur dont la taille change (mobile / bureau).
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const item of items) {
      if (item.lat === null || item.lng === null) continue;
      const selected = item.id === selectedId;
      L.circleMarker([item.lat, item.lng], {
        radius: selected ? 13 : 9,
        color: "#ffffff",
        weight: selected ? 3 : 2,
        fillColor: SAV_STATUS_COLORS[item.status],
        fillOpacity: 0.95,
      })
        .bindTooltip(`${item.name} · ${item.problem_type}`)
        .on("click", () => onSelectRef.current(item.id))
        .addTo(layer);
    }
  }, [items, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (item?.lat != null && item.lng != null) {
      map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 10), { duration: 0.6 });
    }
    // Recentrer uniquement quand la sélection change, pas à chaque mise à jour de la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-[12px]" />
      <button
        type="button"
        onClick={() => mapRef.current?.flyTo(FRANCE_CENTER, FRANCE_ZOOM, { duration: 0.6 })}
        className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-lg border border-[#e1e8f2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0b1f3a] shadow hover:bg-[#f4f7fb]"
      >
        <Locate className="h-3.5 w-3.5" />
        Vue France
      </button>
    </div>
  );
}
