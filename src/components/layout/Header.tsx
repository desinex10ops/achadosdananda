"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Menu,
  Bell,
  PlusCircle,
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/offers?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="relative w-64 sm:w-80 md:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produto, cupom, grupo, categoria..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
          />
        </form>
      </div>

      {/* Right Header Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick status indicators */}
        <div className="hidden md:flex items-center gap-2 border-r border-slate-200 pr-3 mr-1 text-xs">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 font-medium border border-emerald-200/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fila Pronta</span>
          </div>
          <Link
            href="/queue"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 hover:underline"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Ver Fila</span>
          </Link>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Notificações"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-sm font-semibold text-slate-800">Notificações</span>
                <span className="text-xs text-rose-600 cursor-pointer">Marcar lidas</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <div className="font-medium text-slate-800">⚡ Oferta adicionada à fila</div>
                  <div className="text-slate-500 mt-0.5">Air Fryer Digital 4L pronta para disparo.</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Há 10 minutos</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <div className="font-medium text-slate-800">🎟️ Cupom próximo do vencimento</div>
                  <div className="text-slate-500 mt-0.5">Cupom MELI15OFF vence em 2 dias.</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Hoje às 18:20</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nova Oferta Top Button */}
        <Link
          href="/offers/new"
          className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Oferta</span>
        </Link>
      </div>
    </header>
  );
}
