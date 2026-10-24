import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Paris";

/** Choix proposés pour « les X derniers NRP de chaque télépro ». */
export const REDISTRIBUTION_LIMIT_OPTIONS = [10, 20, 30, 50, 100, 200] as const;
export const REDISTRIBUTION_DEFAULT_LIMIT = 50;
export const REDISTRIBUTION_MAX_LIMIT = 500;

export interface RedistributionCandidate {
  id: string;
  /** Télépro qui a le lead aujourd'hui. */
  currentTelepro: string;
  /** Tous les télépros qui ont déjà eu ce lead (le télépro actuel inclus). */
  pastTelepros: ReadonlySet<string>;
}

export interface RedistributionAssignment {
  leadId: string;
  from: string;
  to: string;
}

export interface RedistributionPlan {
  assignments: RedistributionAssignment[];
  /** Leads que tous les télépros cibles ont déjà eus : ils ne bougent pas. */
  unassigned: string[];
}

/** Mélange de Fisher-Yates (copie, n'altère pas l'entrée). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Mélange les leads puis les répartit le plus équitablement possible entre les
 * télépros cibles, sans jamais donner un lead à un télépro qui l'a déjà eu.
 *
 * Les leads les plus contraints (peu de télépros possibles) sont placés en
 * premier pour qu'ils ne se retrouvent pas sans destinataire en fin de liste ;
 * à contrainte égale, l'ordre reste celui du mélange. Chaque lead va au télépro
 * éligible qui en a reçu le moins, au hasard en cas d'égalité.
 */
export function planRedistribution(
  candidates: readonly RedistributionCandidate[],
  targets: readonly string[],
  random: () => number = Math.random
): RedistributionPlan {
  const uniqueTargets = [...new Set(targets)];
  const received = new Map<string, number>(uniqueTargets.map((t) => [t, 0]));

  const withEligible = shuffle(candidates, random).map((lead) => ({
    lead,
    eligible: uniqueTargets.filter(
      (t) => t !== lead.currentTelepro && !lead.pastTelepros.has(t)
    ),
  }));
  // Array.prototype.sort est stable : l'ordre du mélange est conservé à égalité.
  withEligible.sort((a, b) => a.eligible.length - b.eligible.length);

  const assignments: RedistributionAssignment[] = [];
  const unassigned: string[] = [];

  for (const { lead, eligible } of withEligible) {
    if (eligible.length === 0) {
      unassigned.push(lead.id);
      continue;
    }
    const min = Math.min(...eligible.map((t) => received.get(t) ?? 0));
    const leastServed = eligible.filter((t) => (received.get(t) ?? 0) === min);
    const to = leastServed[Math.floor(random() * leastServed.length)];
    received.set(to, (received.get(to) ?? 0) + 1);
    assignments.push({ leadId: lead.id, from: lead.currentTelepro, to });
  }

  return { assignments, unassigned };
}

/** Date du jour (YYYY-MM-DD) en heure française, décalée de `offsetDays`. */
export function parisDateString(now: Date = new Date(), offsetDays = 0): string {
  const shifted = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  // fr-CA formate en YYYY-MM-DD.
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

/** Fin de journée (23:59:59.999, heure française) d'une date YYYY-MM-DD, en ISO UTC. */
export function parisEndOfDayIso(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (local.getMonth() !== m - 1 || local.getDate() !== d) return null;
  return fromZonedTime(local, TIMEZONE).toISOString();
}

/** Lit le nombre de leads par télépro ; null si invalide. */
export function parseRedistributionLimit(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 1 || n > REDISTRIBUTION_MAX_LIMIT) return null;
  return n;
}
