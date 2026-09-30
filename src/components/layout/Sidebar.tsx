"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flame,
  Calendar,
  Users,
  Palette,
  Ticket,
  Link2,
  BarChart3,
  Store,
  Settings,
  ChevronDown,
  PlusCircle,
  Clock,
  Radar,
  History,
  ListOrdered,
  Sparkles,
  X,
  Instagram,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [offersOpen, setOffersOpen] = useState(true);
  const [instagramOpen, setInstagramOpen] = useState(true);

  const isOffersActive =
    pathname.startsWith("/offers") ||
    pathname === "/radar" ||
    pathname === "/queue" ||
    pathname === "/history";

  const isInstagramActive = pathname.startsWith("/instagram");

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      name: "Instagram Auto",
      icon: Instagram,
      isSubmenu: true,
      isOpen: instagramOpen,
      toggle: () => setInstagramOpen(!instagramOpen),
      active: isInstagramActive,
      children: [
        { name: "Painel Instagram", href: "/instagram", icon: Instagram },
        { name: "Criar Automação", href: "/instagram/builder", icon: PlusCircle, highlight: true },
        { name: "Regras Ativas", href: "/instagram/automations", icon: Zap },
        { name: "Fila de Disparo", href: "/instagram/queue", icon: ListOrdered },
        { name: "Logs & Auditoria", href: "/instagram/logs", icon: History },
        { name: "Contas Conectadas", href: "/instagram/accounts", icon: Users },
      ],
    },
    {
      name: "Ofertas",
      icon: Flame,
      isSubmenu: true,
      isOpen: offersOpen,
      toggle: () => setOffersOpen(!offersOpen),
      active: isOffersActive,
      children: [
        { name: "Todas as Ofertas", href: "/offers", icon: Flame },
        { name: "Nova Oferta", href: "/offers/new", icon: PlusCircle, highlight: true },
        { name: "Radar de Ofertas", href: "/radar", icon: Radar },
        { name: "Fila de Publicações", href: "/queue", icon: ListOrdered },
        { name: "Histórico", href: "/history", icon: History },
      ],
    },
    {
      name: "Agenda",
      href: "/calendar",
      icon: Calendar,
      active: pathname === "/calendar",
    },
    {
      name: "Grupos",
      href: "/groups",
      icon: Users,
      active: pathname === "/groups",
    },
    {
      name: "Templates",
      href: "/templates",
      icon: Palette,
      active: pathname === "/templates",
    },
    {
      name: "Automações",
      href: "/automation",
      icon: Sparkles,
      active: pathname === "/automation",
    },
    {
      name: "Cupons",
      href: "/coupons",
      icon: Ticket,
      active: pathname === "/coupons",
    },
    {
      name: "Links",
      href: "/links",
      icon: Link2,
      active: pathname === "/links",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      active: pathname === "/analytics",
    },
    {
      name: "Marketplaces",
      href: "/marketplaces",
      icon: Store,
      active: pathname === "/marketplaces",
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-200 transition-transform duration-300 ease-in-out border-r border-slate-800",
          isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white shadow-md shadow-rose-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                Achados da Nanda
              </h1>
              <span className="text-[11px] font-medium text-slate-400">
                Central de Afiliado
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 pb-2">
          <Link
            href="/offers/new"
            onClick={onCloseMobile}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/25 transition-all hover:bg-rose-500 active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Oferta</span>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigation.map((item) => {
            if (item.isSubmenu) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => item.toggle?.()}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      item.active
                        ? "bg-slate-800/80 text-rose-400 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200 text-slate-400",
                        item.isOpen ? "rotate-180" : ""
                      )}
                    />
                  </button>

                  {item.isOpen && (
                    <div className="pl-6 pr-1 space-y-1">
                      {item.children?.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={onCloseMobile}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                              isSubActive
                                ? "bg-rose-600/15 text-rose-400 font-semibold"
                                : sub.highlight
                                ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                            )}
                          >
                            <sub.icon className="h-3.5 w-3.5" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href!}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-rose-600 text-white font-semibold shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Quick links to public portals */}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Páginas Públicas (PWA)
            </div>
            <div className="space-y-1">
              <Link
                href="/achados"
                target="_blank"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="h-3.5 w-3.5" />
                  <span>Vitrine de Achados</span>
                </div>
                <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">abrir ↗</span>
              </Link>

              <Link
                href="/cupons-vip"
                target="_blank"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className="h-3.5 w-3.5" />
                  <span>Cupons VIP do Dia</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">abrir ↗</span>
              </Link>

              <Link
                href="/vip"
                target="_blank"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Página Captura VIP</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">abrir ↗</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
              FN
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-white truncate">
                Fernanda (Nanda)
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Afiliado Ativo
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
