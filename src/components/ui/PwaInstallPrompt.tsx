"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, CheckCircle2 } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Registrar Service Worker para habilitar PWA completo e cache offline
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration skipped:", err));
    }

    // 2. Verificar se já está rodando em modo standalone (PWA instalado)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standalone);

    // Detecção iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const dismissedUntil = localStorage.getItem("pwa_dismissed_until");
      if (!dismissedUntil || Number(dismissedUntil) <= Date.now()) {
        setShowPrompt(true);
      }
    };

    // Permite abrir o modal manualmente pelo botão "Baixar App" da barra inferior
    const handleManualOpen = () => {
      if (standalone) return;
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("open-pwa-install", handleManualOpen);

    if (standalone) {
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("open-pwa-install", handleManualOpen);
      };
    }

    // Verificar se o usuário já dispensou recentemente
    const dismissedUntil = localStorage.getItem("pwa_dismissed_until");
    const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

    // Se for iOS Safari, mostra aviso amigável após 3 segundos
    if (isAppleDevice && !standalone && !isDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("open-pwa-install", handleManualOpen);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-pwa-install", handleManualOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Não exibir automaticamente por 5 dias
    localStorage.setItem(
      "pwa_dismissed_until",
      (Date.now() + 5 * 24 * 60 * 60 * 1000).toString()
    );
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-rose-500/50 p-4 shadow-2xl shadow-black/80 text-white backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-rose-500/30">
              N
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span>App Achados da Nanda</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Oficial
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {isIos
                  ? "Instale no seu iPhone para acessar ofertas e cupons VIP em 1 toque!"
                  : "Adicione o App na tela inicial para abrir mais rápido e sem ocupar espaço!"}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions or Install CTA */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
          {isIos || !deferredPrompt ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full text-[11px] bg-slate-950/70 rounded-xl px-3 py-2 border border-slate-800">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Share className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isIos
                    ? "Toque em Compartilhar e depois em"
                    : "No menu do navegador (⋮), toque em"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                <PlusSquare className="h-3 w-3 text-rose-400" />
                Adicionar à Tela de Início
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={handleDismiss}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium px-2 py-1"
              >
                Agora não
              </button>
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-pink-500 transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instalar Aplicativo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
