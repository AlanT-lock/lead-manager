import { createBrowserClient } from '@supabase/ssr';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

declare global {
  interface Window {
    __SUPABASE_ENV?: { url: string; anonKey: string };
  }
}

function isInvalidUrl(url: string): boolean {
  return !url || url.includes('xxxxx') || url.includes('placeholder') || url.length < 20;
}

export function createClient() {
  if (typeof window !== 'undefined') {
    const injected = window.__SUPABASE_ENV;
    if (!injected?.url || !injected?.anonKey || isInvalidUrl(injected.url)) {
      const msg =
        "Config Supabase manquante ou invalide. Le serveur n'a pas envoyé une URL valide. " +
        "Vérifiez que vous lancez 'npm run dev' depuis le dossier du projet (celui qui contient .env.local), " +
        "que .env.local contient NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY, puis redémarrez le serveur.";
      throw new Error(msg);
    }
    return createBrowserClient(injected.url, injected.anonKey);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
  return createBrowserClient(url, key);
}
