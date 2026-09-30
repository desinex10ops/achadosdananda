"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Flame,
  PlusCircle,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Edit3,
  ListOrdered,
  Package,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface Offer {
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
  _count: { clicks: number; conversions: number };
}

export default function OffersListPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      }
    >
      <OffersListContent />
    </React.Suspense>
  );
}

function OffersListContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [marketplaceFilter, setMarketplaceFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("q", searchTerm);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (marketplaceFilter !== "ALL") params.append("marketplaceId", marketplaceFilter);

      const res = await fetch(`/api/offers?${params.toString()}`);
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

  useEffect(() => {
    fetchOffers();
  }, [statusFilter, marketplaceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOffers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta oferta?")) return;
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (res.ok) fetchOffers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Todas as Ofertas
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              {offers.length} ofertas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie seu catálogo completo de produtos e ofertas promocionais.
          </p>
        </div>

        <Link
          href="/offers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nova Oferta</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por produto, marca ou cupom..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-rose-500 focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="QUEUED">Na Fila</option>
            <option value="SCHEDULED">Agendada</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="RADAR">Radar</option>
            <option value="DRAFT">Rascunho</option>
          </select>
        </div>
      </div>

      {/* Offers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          </div>
        ) : offers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Nenhuma oferta encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Marketplace</th>
                  <th className="py-3 px-4">Preço Original</th>
                  <th className="py-3 px-4">Preço com Oferta</th>
                  <th className="py-3 px-4">Desconto</th>
                  <th className="py-3 px-4">Cupom</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          {offer.product?.imageUrl ? (
                            <img
                              src={offer.product.imageUrl}
                              alt={offer.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400 m-auto mt-2.5" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <span className="font-semibold text-slate-900 block truncate">
                            {offer.title}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {offer.product?.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {offer.marketplace?.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 line-through">
                      {formatCurrency(offer.originalPrice)}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600">
                      {formatCurrency(offer.currentPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-600">
                        {formatPercentage(offer.discountPercentage)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {offer.couponCode ? (
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {offer.couponCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={offer.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyLink(offer.id, offer.affiliateUrl)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Copiar link afiliado"
                        >
                          {copiedId === offer.id ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={offer.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Abrir link original"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(offer.id)}
                          className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
