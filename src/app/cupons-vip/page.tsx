"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";

interface Coupon {
  id: string;
  code: string;
  marketplace: string;
  discount: string;
  description: string;
  minSpend?: string;
  validUntil: string;
  affiliateUrl: string;
  category: string;
  isHot?: boolean;
}

export default function CuponsVipPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMarketplace, setActiveMarketplace] = useState<string>("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadCoupons() {
      try {
        const url =
          activeMarketplace === "ALL"
            ? "/api/public/coupons"
            : `/api/public/coupons?marketplace=${encodeURIComponent(activeMarketplace)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setCoupons(data.data);
        }
      } catch (err) {
        console.error("Erro ao carregar cupons:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCoupons();
  }, [activeMarketplace]);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getMarketplaceBadge = (marketplace: string) => {
    switch (marketplace.toLowerCase()) {
      case "mercado livre":
        return {
          bg: "bg-amber-400 text-slate-900 border-amber-500",
          pill: "bg-amber-50 text-amber-900 border-amber-200",
          icon: "🟡",
        };
      case "shopee":
        return {
          bg: "bg-orange-600 text-white border-orange-700",
          pill: "bg-orange-50 text-orange-700 border-orange-200",
          icon: "🟠",
        };
      case "amazon":
        return {
          bg: "bg-slate-900 text-white border-slate-700",
          pill: "bg-slate-100 text-slate-800 border-slate-300",
          icon: "📦",
        };
      default:
        return {
          bg: "bg-rose-600 text-white border-rose-700",
          pill: "bg-rose-50 text-rose-700 border-rose-200",
          icon: "🏷️",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 selection:bg-rose-500 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 py-2 px-4 text-center text-xs font-semibold text-white tracking-wide shadow-md">
        <span>🔥 Cupons exclusivos testados e atualizados hoje! Vagas e estoques limitados.</span>
      </div>

      {/* Hero Section */}
      <header className="px-4 pt-8 pb-6 max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
          <Ticket className="w-3.5 h-3.5" />
          <span>CENTRAL DE CUPONS DO DIA</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Achados da Nanda <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300">Cupons VIP</span>
        </h1>

        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Economize em todas as suas compras! Copie o código com 1 clique e aproveite o desconto diretamente na loja oficial.
        </p>

        {/* Quick Navigation Tabs */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/achados"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          >
            🛍️ Ver Vitrine de Ofertas
          </Link>
          <Link
            href="/vip"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 hover:border-emerald-700 transition flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Grupo VIP Grátis</span>
          </Link>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-3xl mx-auto px-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "ALL", label: "Todos os Cupons" },
            { id: "Mercado Livre", label: "Mercado Livre" },
            { id: "Shopee", label: "Shopee" },
            { id: "Amazon", label: "Amazon" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMarketplace(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeMarketplace === tab.id
                  ? "bg-rose-600 text-white shadow-rose-600/30 shadow-md"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons List */}
      <main className="max-w-3xl mx-auto px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">Nenhum cupom ativo nesta loja</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Novos cupons são adicionados diariamente pela equipe Achados da Nanda.
            </p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const badge = getMarketplaceBadge(coupon.marketplace);
            const isCopied = copiedCode === coupon.code;

            return (
              <div
                key={coupon.id}
                className="relative rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition overflow-hidden group"
              >
                {/* Decorative ticket cutout edge effect */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-r border-slate-800" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-l border-slate-800" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2 pr-2">
                  {/* Left: Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.pill}`}
                      >
                        {badge.icon} {coupon.marketplace}
                      </span>
                      {coupon.isHot && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Mais Usado</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{coupon.validUntil}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        {coupon.discount}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        {coupon.description}
                      </p>
                      {coupon.minSpend && (
                        <p className="text-[11px] font-semibold text-rose-400 mt-1">
                          • {coupon.minSpend}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Code & CTA */}
                  <div className="flex flex-col sm:items-end gap-2.5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Code Copy Box */}
                    <button
                      onClick={() => handleCopyCoupon(coupon.code)}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border border-dashed flex items-center justify-between sm:justify-center gap-3 transition-all ${
                        isCopied
                          ? "bg-emerald-950/70 border-emerald-500 text-emerald-300"
                          : "bg-slate-950 border-slate-700 text-slate-200 hover:border-rose-500 hover:bg-slate-900"
                      }`}
                      title="Clique para copiar"
                    >
                      <span className="font-mono text-sm font-black tracking-wider uppercase">
                        {coupon.code}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>COPIADO!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-400" />
                            <span>COPIAR</span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Affiliate Store Link */}
                    <a
                      href={coupon.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-md hover:from-rose-500 hover:to-pink-500 transition-all active:scale-95"
                    >
                      <span>Ir Para Loja Oficial</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Security & Guarantee Box */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Todos os cupons são verificados e aplicados diretamente nos apps oficiais.</span>
          </div>
        </div>

        {/* Inline VIP Callout Card */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate">Quer cupons secretos antes?</p>
            <p className="text-[11px] text-emerald-400">Entre no nosso WhatsApp VIP grátis</p>
          </div>
          <Link
            href="/vip"
            className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>Entrar Agora</span>
          </Link>
        </div>
      </main>

      {/* PWA Prompt & Mobile Bottom Navigation */}
      <PwaInstallPrompt />
      <MobileBottomNav />
    </div>
  );
}
