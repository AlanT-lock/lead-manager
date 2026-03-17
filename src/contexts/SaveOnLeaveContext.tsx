"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type SaveOnLeaveCallback = () => Promise<void>;

const SaveOnLeaveContext = createContext<{
  registerSaveOnLeave: (callback: SaveOnLeaveCallback) => () => void;
  /** À appeler avant un router.push() programmatique (ex. bouton "Lead suivant") */
  flushBeforeNavigate: () => Promise<void>;
} | null>(null);

export function SaveOnLeaveProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const saveOnLeaveRef = useRef<SaveOnLeaveCallback | null>(null);

  const registerSaveOnLeave = useCallback((callback: SaveOnLeaveCallback) => {
    saveOnLeaveRef.current = callback;
    return () => {
      saveOnLeaveRef.current = null;
    };
  }, []);

  const flushBeforeNavigate = useCallback(async () => {
    const cb = saveOnLeaveRef.current;
    if (cb) await cb();
  }, []);

  useEffect(() => {
    const handler = async (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="/"]');
      if (!anchor || (anchor as HTMLAnchorElement).target === "_blank") return;
      const href = (anchor as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("//")) return;
      const callback = saveOnLeaveRef.current;
      if (!callback) return;

      e.preventDefault();
      e.stopPropagation();
      try {
        await callback();
      } finally {
        router.push(href);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [router]);

  return (
    <SaveOnLeaveContext.Provider value={{ registerSaveOnLeave, flushBeforeNavigate }}>
      {children}
    </SaveOnLeaveContext.Provider>
  );
}

export function useSaveOnLeave() {
  return useContext(SaveOnLeaveContext);
}
