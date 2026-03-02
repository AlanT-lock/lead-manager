"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook qui remplit automatiquement la ville quand le code postal français (5 chiffres) change.
 * Déclenche la requête dès que 5 chiffres sont saisis ET au blur du champ.
 * Retourne { fetchCity, isLoading } pour déclencher manuellement et afficher le chargement.
 */
export function usePostalCodeToCity(
  postalCode: string,
  onCityFound: (city: string) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedRef = useRef<string>("");
  const onCityFoundRef = useRef(onCityFound);
  onCityFoundRef.current = onCityFound;

  const fetchCity = useCallback(() => {
    const code = postalCode.replace(/\D/g, "");
    if (code.length !== 5) return;
    if (lastFetchedRef.current === code) return;

    lastFetchedRef.current = code;
    setIsLoading(true);

    fetch(`/api/geocode/postal-code?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.city) onCityFoundRef.current(data.city);
      })
      .catch(() => {
        lastFetchedRef.current = "";
      })
      .finally(() => setIsLoading(false));
  }, [postalCode]);

  useEffect(() => {
    const code = postalCode.replace(/\D/g, "");
    if (code.length !== 5) return;
    if (lastFetchedRef.current === code) return;

    const controller = new AbortController();
    lastFetchedRef.current = code;
    setIsLoading(true);

    fetch(`/api/geocode/postal-code?code=${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.city) onCityFoundRef.current(data.city);
      })
      .catch(() => {
        lastFetchedRef.current = "";
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [postalCode]);

  return { fetchCity, isLoading };
}
