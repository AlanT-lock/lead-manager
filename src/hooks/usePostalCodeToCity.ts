"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook qui remplit automatiquement la ville quand le code postal français (5 chiffres) change.
 * Déclenche la requête dès que 5 chiffres sont saisis ET au blur du champ.
 * Compatible Safari (pas d'AbortController, headers explicites).
 */
export function usePostalCodeToCity(
  postalCode: string,
  onCityFound: (city: string) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedRef = useRef<string>("");
  const requestIdRef = useRef(0);
  const onCityFoundRef = useRef(onCityFound);
  onCityFoundRef.current = onCityFound;

  const doFetch = useCallback((code: string) => {
    if (code.length !== 5) return;
    if (lastFetchedRef.current === code) return;

    lastFetchedRef.current = code;
    setIsLoading(true);
    const id = ++requestIdRef.current;

    fetch(`/api/geocode/postal-code?code=${encodeURIComponent(code)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Geocoding failed");
        return res.text();
      })
      .then((text) => {
        if (id !== requestIdRef.current) return;
        const data = JSON.parse(text) as { city?: string };
        if (data.city) onCityFoundRef.current(data.city);
      })
      .catch(() => {
        if (id === requestIdRef.current) lastFetchedRef.current = "";
      })
      .finally(() => {
        if (id === requestIdRef.current) setIsLoading(false);
      });
  }, []);

  const fetchCity = useCallback(() => {
    doFetch(postalCode.replace(/\D/g, ""));
  }, [postalCode, doFetch]);

  useEffect(() => {
    const code = postalCode.replace(/\D/g, "");
    if (code.length !== 5) return;
    if (lastFetchedRef.current === code) return;
    doFetch(code);
  }, [postalCode, doFetch]);

  return { fetchCity, isLoading };
}
