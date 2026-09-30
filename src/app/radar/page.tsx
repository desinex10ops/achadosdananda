"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radar,
  PlusCircle,
  Filter,
  ListOrdered,
  Clock,
  EyeOff,
  ExternalLink,
  Flame,
  CheckCircle2,
  Package,
  Sparkles,
  Camera,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { BannerGeneratorModal } from "@/components/ui/BannerGeneratorModal";

interface RadarOffer {
  id: string;
  title: string;
  callout: string | null;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  savedAmount: number;
  couponCode: string | null;
  shippingInfo: string | null;
  originalUrl: string;
  affiliateUrl: string;
  status: string;
  marketplace: { id: string; name: string };
  product: { imageUrl: string; name: string; category: string };
}

export default function RadarPage() {
  const [offers, setOffers] = useState<RadarOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [onlyCoupons, setOnlyCoupons] = useState(false);
  const [onlyFreeShipping, setOnlyFreeShipping] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [selectedOfferForBanner, setSelectedOfferForBanner] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const fetchRadarOffers = async () => {
    try {
      const res = await fetch("/api/offers");
      const json = await res.json();
      if (json.success) {
        setOffers(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanPrices = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/radar/scan", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert(`Varredura concluída! ${json.alertsCount} produtos com super desconto ou cupom identificados.`);
        fetchRadarOffers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchRadarOffers();
  }, []);

  const handleAddToQueue = async (offerId: string) => {
    try {
      // Pega primeiro template padrão
      const tRes = await fetch("/api/templates");
      const tJson = await tRes.json();
      const defaultTemplateId = tJson.data?.[0]?.id;

      const gRes = await fetch("/api/groups");
      const gJson = await gRes.json();
      const defaultGroupId = gJson.data?.groups?.[0]?.id;

      if (!defaultTemplateId || !defaultGroupId) {
        alert("Cadastre templates e grupos primeiro!");
        return;
      }

      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          templateId: defaultTemplateId,
          groupIds: [defaultGroupId],
        }),
      });

      if (res.ok) {
        alert("Oferta adicionada à fila com sucesso!");
        fetchRadarOffers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIgnore = async (offerId: string) => {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IGNORED" }),
      });
      if (res.ok) fetchRadarOffers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (minDiscount > 0 && o.discountPercentage < minDiscount) return false;
    if (onlyCoupons && !o.couponCode) return false;
    if (onlyFreeShipping && !o.shippingInfo?.toLowerCase().includes("grátis")) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              🔥 Radar de Ofertas
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              Garimpo Inteligente
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Analise oportunidades, filtre promoções com cupom e decida o que enviar para a fila.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanPrices}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${scanning ? "animate-spin text-rose-500" : ""}`} />
            <span>{scanning ? "Varrendo Preços..." : "Verificar Preços (Scanner)"}</span>
          </button>

          <Link
            href="/offers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Cadastrar no Radar</span>
          </Link>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filtros Rápidos:</span>
        </div>

        <select
          value={minDiscount}
          onChange={(e) => setMinDiscount(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
        >
          <option value={0}>Todos os descontos</option>
          <option value={20}>Mínimo 20% OFF</option>
          <option value={30}>Mínimo 30% OFF</option>
          <option value={40}>Mínimo 40% OFF</option>
          <option value={50}>Mínimo 50% OFF (Metade do preço)</option>
        </select>

        <button
          onClick={() => setOnlyCoupons(!onlyCoupons)}
          className={`rounded-xl px-3 py-1.5 font-semibold transition-colors border ${
            onlyCoupons
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          🎟️ Apenas com cupom
        </button>

        <button
          onClick={() => setOnlyFreeShipping(!onlyFreeShipping)}
          className={`rounded-xl px-3 py-1.5 font-semibold transition-colors border ${
            onlyFreeShipping
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          🚚 Apenas frete grátis
        </button>
      </div>

      {/* Radar Cards Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
          Nenhuma oferta encontrada no radar com estes critérios.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                    {offer.marketplace?.name}
                  </span>
                  <span className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {formatPercentage(offer.discountPercentage)}
                  </span>
                </div>

                {/* Image and title */}
                <div className="flex gap-3 mb-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {offer.product?.imageUrl ? (
                      <img
                        src={offer.product.imageUrl}
                        alt={offer.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-slate-400 m-auto mt-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2">
                      {offer.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {offer.product?.category}
                    </p>
                  </div>
                </div>

                {/* Price block */}
                <div className="rounded-xl bg-slate-50 p-3 mb-4 space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400 line-through">
                      {formatCurrency(offer.originalPrice)}
                    </span>
                    <span className="text-sm font-bold text-rose-600">
                      {formatCurrency(offer.currentPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Economia: {formatCurrency(offer.savedAmount)}</span>
                    {offer.couponCode && (
                      <span className="font-mono font-bold text-amber-700">
                        🎟️ {offer.couponCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedOfferForBanner({
                      title: offer.title,
                      imageUrl: offer.product?.imageUrl || "",
                      originalPrice: offer.originalPrice,
                      currentPrice: offer.currentPrice,
                      discountPercentage: offer.discountPercentage,
                      marketplace: offer.marketplace?.name,
                      affiliateUrl: offer.affiliateUrl,
                    });
                    setBannerModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gerar Banner p/ Story (9:16 ou 1:1)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddToQueue(offer.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>Adicionar à Fila</span>
                  </button>

                  <button
                    onClick={() => handleIgnore(offer.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Ignorar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Gerador de Banner Automático */}
      <BannerGeneratorModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        offer={selectedOfferForBanner}
      />
    </div>
  );
}
