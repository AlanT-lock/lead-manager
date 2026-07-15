"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PER_PAGE_COOKIE, PER_PAGE_OPTIONS, pageCount, pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type LeadsPaginationProps = {
  /** Page courante, 1-indexée et déjà clampée par la page serveur. */
  page: number;
  per: number;
  /** Nombre total de leads pour le filtre courant. */
  total: number;
};

export function LeadsPagination({ page, per, total }: LeadsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const count = pageCount(total, per);

  const pushWith = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const goToPage = (target: number) => {
    pushWith((params) => {
      if (target <= 1) params.delete("page");
      else params.set("page", String(target));
    });
  };

  const changePerPage = (value: string) => {
    // Cookie lisible côté serveur : la prochaine visite se rend directement à la bonne taille.
    document.cookie = `${PER_PAGE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    pushWith((params) => {
      params.set("per", value);
      params.delete("page");
    });
  };

  // Une seule page : la barre n'apporterait rien.
  if (count <= 1) return null;

  const first = (page - 1) * per + 1;
  const last = Math.min(page * per, total);

  return (
    <div
      data-testid="pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[#64748b]">
        {first}–{last} sur {total} lead{total > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            data-testid="pagination-prev"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e8f0] text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f1f5f9]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers(page, count).map((entry, index) =>
            entry === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="px-1 text-sm text-[#94a3b8]"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                data-testid={`pagination-page-${entry}`}
                onClick={() => goToPage(entry)}
                disabled={entry === page}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-8 rounded-md border px-2 text-sm",
                  entry === page
                    ? "cursor-default border-[#2563eb] bg-[#2563eb] font-semibold text-white"
                    : "border-[#e2e8f0] text-[#0b1f3a] hover:bg-[#f1f5f9]"
                )}
              >
                {entry}
              </button>
            )
          )}

          <button
            type="button"
            data-testid="pagination-next"
            onClick={() => goToPage(page + 1)}
            disabled={page >= count}
            aria-label="Page suivante"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e8f0] text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f1f5f9]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <label className="flex items-center gap-2 text-sm text-[#64748b]">
          Par page
          <select
            data-testid="pagination-per"
            value={per}
            onChange={(event) => changePerPage(event.target.value)}
            className="h-8 rounded-md border border-[#e2e8f0] bg-white px-2 text-sm text-[#0b1f3a]"
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
