import { fromZonedTime } from "date-fns-tz";

/**
 * Fuseau horaire utilisé pour l'affichage (heure française)
 */
const TIMEZONE = "Europe/Paris";

/**
 * Formate une date ISO (UTC) en heure française pour l'affichage.
 * Ex: "15 janv. 14:30"
 */
export function formatDateTimeParis(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/**
 * Formate une date ISO en heure uniquement (HH:mm) en heure française.
 */
export function formatTimeParis(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/**
 * Formate une date ISO en date uniquement (jj/mm/aaaa) en heure française.
 */
export function formatDateParis(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

/**
 * Formate une date ISO en date et heure complètes en heure française.
 */
export function formatFullDateTimeParis(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

/**
 * Convertit une date ISO en valeur pour input datetime-local, en heure française.
 * L'input datetime-local attend une chaîne "YYYY-MM-DDTHH:mm" en heure locale.
 */
export function toDatetimeLocalValueParis(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

/**
 * Convertit une valeur datetime-local (saisie en heure française) en ISO UTC.
 */
export function fromDatetimeLocalValueParis(localValue: string): string {
  if (!localValue) return "";
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) return "";
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  const dateWithComponents = new Date(y, m - 1, d, h, min, 0);
  const utcDate = fromZonedTime(dateWithComponents, TIMEZONE);
  return utcDate.toISOString();
}
