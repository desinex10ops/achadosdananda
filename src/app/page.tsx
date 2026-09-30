"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flame,
  Clock,
  Calendar,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Radar,
  ListOrdered,
  Ticket,
  ChevronRight,
  ArrowUpRight,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
  ShoppingBag,
  Zap,
  Package,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface DashboardData {
  metrics: {
    offersTodayCount: number;
    queuedOffersCount: number;
    scheduledOffersCount: number;
    totalClicks: number;
    totalConversions: number;
    estimatedCommission: number;
  };
  featuredOffers: any[];
  upcomingPublications: any[];
  marketplacePerformance: any[];
  chartData: Array<{ day: string; cliques: number; conversoes: number; comissao: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Falha ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Carregando painel de ofertas...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    offersTodayCount: 0,
    queuedOffersCount: 0,
    scheduledOffersCount: 0,
    totalClicks: 0,
    totalConversions: 0,
    estimatedCommission: 0,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Central de Ofertas
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              Afiliado VIP
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Encontre, prepare, agende e monitore suas promoções em poucos cliques.
          </p>
        </div>

        {/* Shortcuts bar (Section 31) */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/offers/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Oferta</span>
          </Link>
          <Link
            href="/radar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Radar className="h-4 w-4 text-rose-500" />
            <span>Radar</span>
          </Link>
          <Link
            href="/queue"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ListOrdered className="h-4 w-4 text-amber-500" />
            <span>Fila</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Calendar className="h-4 w-4 text-sky-500" />
            <span>Agendar</span>
          </Link>
          <Link
            href="/coupons"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Ticket className="h-4 w-4 text-emerald-500" />
            <span>Novo Cupom</span>
          </Link>
        </div>
      </div>

      {/* 6 Metric Cards (Section 6) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Ofertas Hoje"
          value={metrics.offersTodayCount}
          icon={Flame}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          description="Cadastradas hoje"
        />
        <StatCard
          title="Na Fila"
          value={metrics.queuedOffersCount}
          icon={ListOrdered}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          description="Prontas para envio"
        />
        <StatCard
          title="Agendadas"
          value={metrics.scheduledOffersCount}
          icon={Clock}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          description="Programadas"
        />
        <StatCard
          title="Cliques"
          value={metrics.totalClicks.toLocaleString("pt-BR")}
          change="+18%"
          trend="up"
          icon={MousePointerClick}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          description="Total rastreado"
        />
        <StatCard
          title="Conversões"
          value={metrics.totalConversions.toLocaleString("pt-BR")}
          change="+12%"
          trend="up"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          description="Vendas geradas"
        />
        <StatCard
          title="Comissão Est."
          value={formatCurrency(metrics.estimatedCommission)}
          change="+24%"
          trend="up"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-700"
          description="Acumulada"
        />
      </div>

      {/* Chart Section: Evolução (Cliques, Conversões, Comissão) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Evolução de Desempenho (Últimos 7 dias)
            </h2>
            <p className="text-xs text-slate-500">
              Volume diário de cliques, conversões estimadas e comissão obtida.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              Cliques
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Conversões
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Comissão (R$)
            </span>
          </div>
        </div>

        {/* Clean visual bar progression */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-6 border-t border-slate-100 items-end min-h-[160px]">
          {data?.chartData?.map((item, idx) => {
            const maxVal = 550;
            const clickH = Math.round((item.cliques / maxVal) * 120);
            const commH = Math.round((item.comissao / maxVal) * 120);

            return (
              <div key={idx} className="flex flex-col items-center gap-2 group">
                <div className="flex items-end gap-1 w-full justify-center h-[120px]">
                  {/* Cliques bar */}
                  <div
                    style={{ height: `${clickH}px` }}
                    className="w-2.5 sm:w-3.5 rounded-t bg-indigo-400 group-hover:bg-indigo-600 transition-all"
                    title={`Cliques: ${item.cliques}`}
                  />
                  {/* Comissao bar */}
                  <div
                    style={{ height: `${commH}px` }}
                    className="w-2.5 sm:w-3.5 rounded-t bg-rose-500 group-hover:bg-rose-600 transition-all"
                    title={`Comissão: R$ ${item.comissao.toFixed(2)}`}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {item.day}
                </span>
                <span className="text-[10px] text-slate-400 -mt-1">
                  {item.cliques} cliq
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Ofertas de Destaque + Próximas Publicações */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Ofertas de Destaque (7 cols) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ofertas de Destaque
              </h2>
              <p className="text-xs text-slate-500">
                Produtos com maior desconto e engajamento
              </p>
            </div>
            <Link
              href="/offers"
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <span>Ver todas</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {data?.featuredOffers?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma oferta cadastrada ainda.
              </div>
            ) : (
              data?.featuredOffers?.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between py-3.5 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {offer.product?.imageUrl ? (
                        <img
                          src={offer.product.imageUrl}
                          alt={offer.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {offer.marketplace?.name}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600">
                          {formatPercentage(offer.discountPercentage)}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {offer.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(offer.originalPrice)}
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          {formatCurrency(offer.currentPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={offer.status} />
                    <Link
                      href={`/offers/new?duplicateId=${offer.id}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Reutilizar/Editar"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Próximas Publicações na Fila (5 cols) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Próximas Publicações
              </h2>
              <p className="text-xs text-slate-500">
                Fila programada para distribuição
              </p>
            </div>
            <Link
              href="/queue"
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <span>Gerenciar Fila</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1 space-y-1">
            {data?.upcomingPublications?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma publicação agendada na fila no momento.
              </div>
            ) : (
              data?.upcomingPublications?.map((pub) => {
                const groupName = pub.publicationGroups?.[0]?.group?.name || "Grupo VIP";
                const scheduleTime = pub.scheduledFor
                  ? new Date(pub.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Imediato";

                return (
                  <div key={pub.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          ⏰ {scheduleTime}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                          {groupName}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate mt-1">
                        {pub.offer?.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Template: {pub.template?.name}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <StatusBadge status={pub.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Desempenho por Marketplace (Section 6) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900">
            Desempenho por Marketplace
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de volume de ofertas, cliques e conversões por plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.marketplacePerformance?.slice(0, 3).map((market) => (
            <div
              key={market.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-rose-600">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{market.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      Comissão média: {market.commissionRate}%
                    </span>
                  </div>
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Ofertas</span>
                  <p className="text-xs font-bold text-slate-800">{market.offersCount}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Cliques</span>
                  <p className="text-xs font-bold text-slate-800">{market.clicks || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Vendas</span>
                  <p className="text-xs font-bold text-slate-800">{market.conversions || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
