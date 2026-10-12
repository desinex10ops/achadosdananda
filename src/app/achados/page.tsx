"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Flame,
  CheckCircle2,
  Ticket,
  Copy,
  Check,
  ExternalLink,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Clock,
  ChevronDown,
  X,
  Share2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";

export default function AchadosVitrinePage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [marketplace, setMarketplace] = useState("todos");
  const [sort, setSort] = useState("discount");
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const categories = ["Todas", "Cozinha", "Eletrônicos", "Casa", "Beleza", "Moda"];

  const loadOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category && category !== "Todas") params.set("category", category);
      if (marketplace && marketplace !== "todos") params.set("marketplace", marketplace);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/public/offers?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.offers) {
        setOffers(json.offers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOffers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, marketplace, sort]);

  const handleCopyCoupon = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleShareOffer = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const priceFormatted = `R$ ${Number(item.currentPrice).toFixed(2).replace(".", ",")}`;
    const shareText = `🔥 *${item.title}*\n💰 Por apenas *${priceFormatted}*${
      item.couponCode ? `\n🎟️ Cupom: *${item.couponCode}*` : ""
    }\n\n👇 Confira na loja oficial:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: item.affiliateUrl,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(`${shareText} ${item.affiliateUrl}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Container Responsivo com Limite de Visualização Confortável */}
      <div className="w-full max-w-5xl px-4 py-6 sm:py-8 flex flex-col pb-28">
        
        {/* Header da Vitrine */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600">
              <div className="w-12 h-12 rounded-full overflow-hidden relative border border-slate-900 bg-slate-800">
                <Image
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  alt="Nanda"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black text-white">Achados da Nanda</h1>
                <CheckCircle2 className="w-4 h-4 fill-sky-400 text-slate-950" />
              </div>
              <p className="text-xs text-slate-400">Curadoria de ofertas e cupons verificados</p>
            </div>
          </div>

          {/* Botão para o Grupo VIP do WhatsApp */}
          <Link
            href="/vip"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>GRUPO VIP NO WHATSAPP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        {/* Barra de Busca & Filtros Rápidos */}
        <div className="pt-6 space-y-4">
          {/* Campo de Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="O que você está procurando? Ex: air fryer, garrafa, fone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros em Pílulas (Categorias) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                  category === cat
                    ? "bg-rose-600 text-white border-rose-500"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sub-filtros: Loja e Ordenação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Loja:</span>
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="todos">Todas as Lojas</option>
                <option value="shopee">Shopee</option>
                <option value="amazon">Amazon</option>
                <option value="mercado-livre">Mercado Livre</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Ordenar:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="discount">Maior Desconto (%)</option>
                <option value="newest">Mais Recentes</option>
                <option value="price_asc">Menor Preço (R$)</option>
                <option value="price_desc">Maior Preço (R$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grade de Produtos / Achadinhos */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Achadinhos Disponíveis ({offers.length})
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 animate-pulse h-72" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-pink-500/50 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {search ? "Nenhum produto encontrado" : "Novos achadinhos sendo preparados!"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search
                  ? "Tente buscar por outro termo ou selecione outra categoria."
                  : "Estamos garimpando as melhores ofertas do dia. Entre no nosso Grupo VIP no WhatsApp para receber em primeira mão!"}
              </p>
              {!search && (
                <Link
                  href="/vip"
                  className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
                >
                  Entrar no Grupo VIP do WhatsApp 💬
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {offers.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 group relative shadow-md"
                >
                  <div>
                    {/* Imagem do Produto */}
                    <div className="relative aspect-square w-full rounded-xl bg-slate-950 overflow-hidden mb-2.5 border border-slate-800">
                      <Image
                        src={
                          item.imageUrl && !item.imageUrl.startsWith("blob:")
                            ? item.imageUrl
                            : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80"
                        }
                        alt={item.title}
                        fill
                        unoptimized={Boolean(item.imageUrl?.startsWith("data:"))}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Desconto */}
                      {item.discountPercentage > 0 && (
                        <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow">
                          -{item.discountPercentage}%
                        </span>
                      )}
                      {/* Tag Loja */}
                      <span className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                        {item.marketplace}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="text-xs font-semibold text-white line-clamp-2 leading-snug mb-2 group-hover:text-rose-400 transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  <div>
                    {/* Cupom se houver */}
                    {item.couponCode && (
                      <button
                        onClick={(e) => handleCopyCoupon(item.couponCode, e)}
                        className="w-full flex items-center justify-between px-2 py-1 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-500/20 transition"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <Ticket className="w-3 h-3" />
                          <span>{item.couponCode}</span>
                        </span>
                        <span>{copiedCoupon === item.couponCode ? "COPIADO!" : "COPIAR"}</span>
                      </button>
                    )}

                    {/* Preços */}
                    <div className="mb-2.5">
                      {item.originalPrice > item.currentPrice && (
                        <div className="text-[11px] text-slate-500 line-through">
                          R$ {Number(item.originalPrice).toFixed(2).replace(".", ",")}
                        </div>
                      )}
                      <div className="text-base font-black text-emerald-400">
                        R$ {Number(item.currentPrice).toFixed(2).replace(".", ",")}
                      </div>
                    </div>

                    {/* Botão de Compra + Compartilhar */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={item.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
                      >
                        <span>Pegar Oferta</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleShareOffer(item, e)}
                        title="Compartilhar oferta no WhatsApp"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 active:scale-95 transition shrink-0"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card de Chamada para o Grupo VIP no Final da Lista */}
        <div className="mt-8">
          <Link
            href="/vip"
            className="w-full bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 text-white hover:border-emerald-500/60 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Receba bugs de preço no WhatsApp
                </p>
                <p className="text-[11px] text-slate-400">
                  Alertas em tempo real antes do estoque acabar
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 whitespace-nowrap">
              Entrar Grátis →
            </span>
          </Link>
        </div>

        {/* PWA Prompt & Barra de Navegação Inferior Mobile */}
        <PwaInstallPrompt />
        <MobileBottomNav />

      </div>
    </div>
  );
}
