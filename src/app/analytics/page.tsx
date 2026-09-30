"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Layers,
  Store,
  Users,
  MessageCircle,
  Instagram,
  Package,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: string;
    estimatedCommission: number;
    realLeadsCount: number;
    totalOffers: number;
    totalGroups: number;
  };
  marketplaces: Array<{
    name: string;
    clicks: number;
    percentage: number;
    commission: number;
    color: string;
  }>;
  channels: Array<{
    channel: string;
    icon: string;
    clicks: number;
    percentage: number;
    estimatedRevenue: number;
  }>;
  topOffers: Array<{
    id: string;
    title: string;
    price: number;
    originalPrice: number;
    marketplace: string;
    imageUrl: string | null;
    clicks: number;
    conversions: number;
    commission: number;
  }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Erro ao carregar dados analíticos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [period]);

  // Exportar relatório em CSV com UTF-8 BOM
  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM para compatibilidade com Microsoft Excel
    csvContent += "Relatório Financeiro & Desempenho - Achados da Nanda\n";
    csvContent += `Período: ${period.toUpperCase()}; Gerado em: ${new Date().toLocaleString("pt-BR")}\n\n`;

    csvContent += "MÉTRICAS GERAIS\n";
    csvContent += `Cliques Totais;${data.summary.totalClicks}\n`;
    csvContent += `Conversões Estimadas;${data.summary.totalConversions}\n`;
    csvContent += `Taxa de Conversão;${data.summary.conversionRate}\n`;
    csvContent += `Comissão Estimada;R$ ${data.summary.estimatedCommission.toFixed(2)}\n`;
    csvContent += `Leads no WhatsApp VIP;${data.summary.realLeadsCount}\n\n`;

    csvContent += "DESEMPENHO POR MARKETPLACE\n";
    csvContent += "Marketplace;Cliques;Participação (%);Comissão Estimada (R$)\n";
    data.marketplaces.forEach((m) => {
      csvContent += `${m.name};${m.clicks};${m.percentage}%;R$ ${m.commission.toFixed(2)}\n`;
    });
    csvContent += "\n";

    csvContent += "DESEMPENHO POR CANAL\n";
    csvContent += "Canal de Tráfego;Cliques;Participação (%);Receita Estimada (R$)\n";
    data.channels.forEach((c) => {
      csvContent += `${c.channel};${c.clicks};${c.percentage}%;R$ ${c.estimatedRevenue.toFixed(2)}\n`;
    });
    csvContent += "\n";

    csvContent += "TOP OFERTAS MAIS RENTÁVEIS\n";
    csvContent += "Produto;Marketplace;Preço (R$);Cliques;Vendas Estimadas;Comissão (R$)\n";
    data.topOffers.forEach((o) => {
      const safeTitle = o.title.replace(/;/g, " ");
      csvContent += `${safeTitle};${o.marketplace};R$ ${o.price.toFixed(2)};${o.clicks};${o.conversions};R$ ${o.commission.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-financeiro-achados-nanda-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              📊 Relatório Financeiro & Desempenho
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Tempo Real
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Métricas de tráfego, vendas estimadas, canais e extrato financeiro para prestação de contas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-xs">
            <button
              onClick={() => setPeriod("today")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === "today" ? "bg-rose-600 text-white font-bold" : "hover:bg-slate-50"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod("7d")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === "7d" ? "bg-rose-600 text-white font-bold" : "hover:bg-slate-50"
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod("30d")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === "30d" ? "bg-rose-600 text-white font-bold" : "hover:bg-slate-50"
              }`}
            >
              30 Dias
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Baixar planilha para Excel/Google Sheets"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Imprimir ou salvar PDF"
          >
            <Printer className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-500">Erro ao carregar métricas.</div>
      ) : (
        <>
          {/* Main KPI Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Cliques"
              value={data.summary.totalClicks.toLocaleString("pt-BR")}
              change="+22.4%"
              trend="up"
              icon={MousePointerClick}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              description="Links de afiliados acessados"
            />
            <StatCard
              title="Conversões Estimadas"
              value={data.summary.totalConversions.toString()}
              change="+14.2%"
              trend="up"
              icon={TrendingUp}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              description={`Taxa média: ${data.summary.conversionRate}`}
            />
            <StatCard
              title="Leads no VIP WhatsApp"
              value={data.summary.realLeadsCount.toString()}
              change="+31.5%"
              trend="up"
              icon={Users}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              description="Membros capturados na Landing Page"
            />
            <StatCard
              title="Comissão Estimada Total"
              value={formatCurrency(data.summary.estimatedCommission)}
              change="+26.8%"
              trend="up"
              icon={DollarSign}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              description="Receita estimada do período"
            />
          </div>

          {/* Breakdown Section: Marketplaces + Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Marketplaces */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-slate-500" />
                  <span>Desempenho por Marketplace</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">Divisão de Vendas</span>
              </div>

              <div className="space-y-4">
                {data.marketplaces.map((m) => (
                  <div key={m.name}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-800">{m.name}</span>
                      <span className="text-rose-600">
                        {formatCurrency(m.commission)} ({m.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${m.color} rounded-full transition-all duration-500`}
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>{m.clicks} cliques</span>
                      <span>Comissão média 8-11%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  <span>Tráfego & Vendas por Canal</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">Origem do Tráfego</span>
              </div>

              <div className="space-y-4">
                {data.channels.map((c) => (
                  <div
                    key={c.channel}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                        {c.icon === "whatsapp" ? (
                          <MessageCircle className="h-5 w-5 text-emerald-600" />
                        ) : c.icon === "instagram" ? (
                          <Instagram className="h-5 w-5 text-pink-600" />
                        ) : (
                          <Store className="h-5 w-5 text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{c.channel}</h4>
                        <p className="text-[11px] text-slate-500">{c.clicks} cliques ({c.percentage}%)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700">
                        {formatCurrency(c.estimatedRevenue)}
                      </p>
                      <p className="text-[10px] text-slate-400">comissão est.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Ranked Offers Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-rose-500" />
                  <span>Ranking das Melhores Ofertas (Mais Rentáveis)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Produtos com maior tração de cliques e receita gerada nos canais
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-1">Produto</th>
                    <th className="pb-3">Loja</th>
                    <th className="pb-3 text-right">Preço</th>
                    <th className="pb-3 text-center">Cliques</th>
                    <th className="pb-3 text-center">Vendas Est.</th>
                    <th className="pb-3 text-right pr-1">Comissão Estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topOffers.map((offer, idx) => (
                    <tr key={offer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-4">
                            #{idx + 1}
                          </span>
                          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {offer.imageUrl ? (
                              <img
                                src={offer.imageUrl}
                                alt={offer.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-900 truncate max-w-xs block" title={offer.title}>
                            {offer.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {offer.marketplace}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(offer.price)}
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-600">
                        {offer.clicks}
                      </td>
                      <td className="py-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-100">
                          {offer.conversions} vendas
                        </span>
                      </td>
                      <td className="py-3 text-right pr-1 font-bold text-rose-600">
                        {formatCurrency(offer.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
