"use client";

import { useEffect, useRef } from "react";

/**
 * Hook qui remplit automatiquement la ville quand le code postal français (5 chiffres) change.
 * Appelle onCityFound avec la ville récupérée via l'API de géocodage.
 */
export function usePostalCodeToCity(
  postalCode: string,
  onCityFound: (city: string) => void
) {
  const lastFetchedRef = useRef<string>("");
  const onCityFoundRef = useRef(onCityFound);
  onCityFoundRef.current = onCityFound;

  useEffect(() => {
    const code = postalCode.replace(/\D/g, "");
    if (code.length !== 5) return;
    if (lastFetchedRef.current === code) return;

    const controller = new AbortController();
    lastFetchedRef.current = code;

    fetch(`/api/geocode/postal-code?code=${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.city) onCityFoundRef.current(data.city);
      })
      .catch(() => {
        lastFetchedRef.current = "";
      });

    return () => controller.abort();
  }, [postalCode]);
}
