"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Phone,
  Calendar,
  Menu,
  X,
  LogOut,
  Bell,
  FileUp,
  UserPlus,
  List,
  FileCheck,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DrawerProps {
  role: "admin" | "telepro" | "secretaire";
  userName?: string;
  unreadNotifications?: number;
}

const adminNav = [
  { href: "/admin", label: "Statistique télépro", icon: TrendingUp },
  { href: "/admin/leads", label: "Tous les leads", icon: List },
  { href: "/admin/documents-recus", label: "Documents reçus", icon: FileCheck },
  { href: "/admin/import", label: "Import CSV", icon: FileUp },
  { href: "/admin/users", label: "Utilisateurs", icon: UserPlus },
  { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
];

const secretaireNav = [
  { href: "/admin/documents-recus", label: "Documents reçus", icon: FileCheck },
  { href: "/admin/leads", label: "Tous les leads", icon: List },
  { href: "/admin/import", label: "Import CSV", icon: FileUp },
  { href: "/admin/stats-secretaire", label: "Statistiques", icon: BarChart3 },
  { href: "/admin", label: "Statistique télépro", icon: TrendingUp },
];

const teleproNav = [
  { href: "/telepro", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/telepro/leads", label: "Mes leads", icon: Users },
  { href: "/telepro/teleprospection", label: "Téléprospection", icon: Phone },
  { href: "/telepro/agenda", label: "Agenda", icon: Calendar },
];

export function Drawer({ role, userName, unreadNotifications = 0 }: DrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Le menu suit l'URL : /admin → menu admin/secretaire, /telepro → menu télépro
  const isAdminSpace = pathname.startsWith("/admin");
  const nav = isAdminSpace ? (role === "secretaire" ? secretaireNav : adminNav) : teleproNav;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Link href={isAdminSpace ? (role === "secretaire" ? "/admin/documents-recus" : "/admin") : "/telepro"} className="block">
                <Image
                  src="/logo.png"
                  alt="RS ÉCOLOGIE"
                  width={320}
                  height={114}
                  className="h-28 w-auto object-contain"
                  priority
                />
              </Link>
              <span className={`text-xs font-medium ${isAdminSpace ? "text-blue-600" : "text-slate-500"}`}>
                {isAdminSpace ? (role === "secretaire" ? "Espace secrétaire" : "Espace administrateur") : "Espace télépro"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const homeHref = isAdminSpace ? (role === "secretaire" ? "/admin/documents-recus" : "/admin") : "/telepro";
              const isActive =
                pathname === item.href ||
                (item.href !== homeHref && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 space-y-2">
            {unreadNotifications > 0 && (
              <Link
                href={isAdminSpace ? "/admin/notifications" : "/telepro/notifications"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100"
              >
                <Bell className="w-5 h-5 shrink-0" />
                <span>Notifications</span>
                <span className="ml-auto bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              </Link>
            )}
            {userName && (
              <div className="px-4 py-2 text-sm text-slate-500 truncate">
                {userName}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
