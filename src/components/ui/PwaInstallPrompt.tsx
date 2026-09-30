"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles, Share } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Verificar se já está rodando em modo standalone (PWA instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Verificar se o usuário já dispensou recentemente
    const dismissedUntil = localStorage.getItem("pwa_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Detecção iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Se for iOS Safari, mostra aviso amigável após 3 segundos
    if (isAppleDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Não exibir novamente por 5 dias
    localStorage.setItem("pwa_dismissed_until", (Date.now() + 5 * 24 * 60 * 60 * 1000).toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-rose-500/40 p-4 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center font-black text-white text-lg shadow-md">
              N
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>App Achados da Nanda</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-semibold">
                  Grátis
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {isIos
                  ? "Instale no seu iPhone: toque em Compartilhar e 'Adicionar à Tela de Início'"
                  : "Acesse ofertas e cupons em 1 toque na sua tela inicial!"}
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

        {/* Buttons / Instructions */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {isIos ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold w-full justify-center py-1">
              <Share className="h-3.5 w-3.5" />
              <span>Compartilhar → Adicionar à Tela de Início</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-pink-500 transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instalar App</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
