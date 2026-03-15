import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lead Manager - Gestion des leads",
  description: "Plateforme de gestion des leads pour téléprospection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const envScript =
    typeof window === "undefined"
      ? `window.__SUPABASE_ENV=${JSON.stringify({ url: supabaseUrl, anonKey: supabaseAnonKey })};`
      : "";

  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        <script dangerouslySetInnerHTML={{ __html: envScript }} />
        {children}
      </body>
    </html>
  );
}
