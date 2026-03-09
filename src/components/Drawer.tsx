"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
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
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";

interface DrawerProps {
  role: "admin" | "telepro" | "secretaire";
  userName?: string;
  unreadNotifications?: number;
  statusCounts?: Record<string, number>;
}

const adminNav = [
  { href: "/admin", label: "Statistique télépro", icon: TrendingUp },
  { href: "/admin/leads?status=installe", label: "Dossiers Installés", icon: FileCheck, statusParam: "installe" },
  { href: "/admin/leads", label: "Tous les leads", icon: List, hasStatusSubmenu: true },
  { href: "/admin/stockage", label: "Stockage", icon: Package },
  { href: "/admin/import", label: "Import CSV", icon: FileUp },
  { href: "/admin/users", label: "Utilisateurs", icon: UserPlus },
  { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
];

const secretaireNav = [
  { href: "/admin/documents-recus", label: "Documents reçus", icon: FileCheck },
  { href: "/admin/leads", label: "Tous les leads", icon: List, hasStatusSubmenu: true },
  { href: "/admin/import", label: "Import CSV", icon: FileUp },
  { href: "/admin/stats-secretaire", label: "Statistiques", icon: BarChart3 },
  { href: "/admin", label: "Statistique télépro", icon: TrendingUp },
];

const teleproNav = [
  { href: "/telepro", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/telepro/leads", label: "Mes leads", icon: Users, hasStatusSubmenu: true },
  { href: "/telepro/teleprospection", label: "Téléprospection", icon: Phone },
  { href: "/telepro/agenda", label: "Agenda", icon: Calendar },
];

export function Drawer({ role, userName, unreadNotifications = 0, statusCounts = {} }: DrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#2d4a6d] border border-white/20 shadow-sm hover:bg-[#3d5a80] lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#2d4a6d] border-r border-white/20 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-white/20 flex items-center justify-between">
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
              <span className="text-xs font-medium text-white">
                {isAdminSpace ? (role === "secretaire" ? "Espace secrétaire" : "Espace administrateur") : "Espace télépro"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/20 lg:hidden text-white"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const homeHref = isAdminSpace ? (role === "secretaire" ? "/admin/documents-recus" : "/admin") : "/telepro";
              const isLeadsPage = pathname.startsWith("/admin/leads") && (item.href === "/admin/leads" || item.href.startsWith("/admin/leads?")) || (pathname.startsWith("/telepro/leads") && item.href === "/telepro/leads");
              const isActive =
                "statusParam" in item && item.statusParam
                  ? pathname === "/admin/leads" && searchParams.get("status") === item.statusParam
                  : item.href === "/admin/leads"
                    ? pathname === "/admin/leads" && searchParams.get("status") !== "installe"
                    : pathname === item.href ||
                      (item.href !== homeHref && pathname.startsWith(item.href.split("?")[0]));
              const statuses = LEAD_STATUSES_ADMIN;
              const currentStatus = isLeadsPage ? searchParams.get("status") : null;

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-white/25 text-white font-medium"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                  {"hasStatusSubmenu" in item && item.hasStatusSubmenu && (
                    <div className="pl-4 pr-2 py-1 space-y-1">
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                          !currentStatus
                            ? "bg-white/25 text-white font-medium"
                            : "text-white/90 hover:bg-white/20"
                        }`}
                      >
                        <span>Tous</span>
                        <span className="text-white/70 tabular-nums">
                          {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
                        </span>
                      </Link>
                      {statuses.map((s) => (
                        <Link
                          key={s}
                          href={`${item.href}?status=${s}`}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                            currentStatus === s
                              ? "bg-white/25 text-white font-medium"
                              : "text-white/90 hover:bg-white/20"
                          }`}
                        >
                          <span>{LEAD_STATUS_LABELS[s as LeadStatus]}</span>
                          <span className="text-white/70 tabular-nums">
                            {statusCounts[s] ?? 0}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/20 space-y-2">
            {unreadNotifications > 0 && (
              <Link
                href={isAdminSpace ? "/admin/notifications" : "/telepro/notifications"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/20"
              >
                <Bell className="w-5 h-5 shrink-0" />
                <span>Notifications</span>
                <span className="ml-auto bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              </Link>
            )}
            {userName && (
              <div className="px-4 py-2 text-sm text-white/80 truncate">
                {userName}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white hover:bg-red-500/30 hover:text-white transition-colors"
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
