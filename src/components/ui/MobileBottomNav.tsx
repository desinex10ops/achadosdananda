"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Ticket, MessageCircle, Download, Share2 } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  const handleInstallOrShare = async () => {
    if (!isStandalone) {
      window.dispatchEvent(new CustomEvent("open-pwa-install"));
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Achados da Nanda - Ofertas & Cupons VIP",
          text: "Olha esse app com os melhores achadinhos e cupons da Shopee, Mercado Livre e Amazon! 🔥",
          url: window.location.origin + "/achados",
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.origin + "/achados");
      alert("Link do App copiado para compartilhar!");
    }
  };

  const isAchados = pathname === "/achados" || pathname === "/loja";
  const isCupons = pathname === "/cupons-vip";
  const isVip = pathname === "/vip" || pathname === "/captura";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 gap-1">
        {/* Aba 1: Vitrine de Ofertas */}
        <Link
          href="/achados"
          className={`flex flex-col items-center justify-center h-full rounded-xl transition-colors ${
            isAchados
              ? "text-rose-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isAchados ? "bg-rose-500/15" : ""
            }`}
          >
            <Flame className={`w-5 h-5 ${isAchados ? "fill-rose-500/20 text-rose-400" : ""}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Ofertas</span>
        </Link>

        {/* Aba 2: Cupons VIP */}
        <Link
          href="/cupons-vip"
          className={`flex flex-col items-center justify-center h-full rounded-xl transition-colors ${
            isCupons
              ? "text-amber-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isCupons ? "bg-amber-500/15" : ""
            }`}
          >
            <Ticket className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Cupons VIP</span>
        </Link>

        {/* Aba 3: Grupo VIP WhatsApp */}
        <Link
          href="/vip"
          className={`relative flex flex-col items-center justify-center h-full rounded-xl transition-colors ${
            isVip
              ? "text-emerald-400 font-bold"
              : "text-emerald-400/90 hover:text-emerald-300"
          }`}
        >
          <span className="absolute top-1.5 right-4 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div
            className={`p-1 rounded-lg transition-colors ${
              isVip ? "bg-emerald-500/20" : "bg-emerald-500/10"
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-semibold tracking-tight">Grupo VIP</span>
        </Link>

        {/* Aba 4: Instalar App ou Compartilhar */}
        <button
          type="button"
          onClick={handleInstallOrShare}
          className="flex flex-col items-center justify-center h-full rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <div className="p-1 rounded-lg">
            {isStandalone ? (
              <Share2 className="w-5 h-5 text-sky-400" />
            ) : (
              <Download className="w-5 h-5 text-rose-400" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isStandalone ? "Indicar App" : "Baixar App"}
          </span>
        </button>
      </div>
    </nav>
  );
}
