"use client";

import React, { useState } from "react";
import { Link2, PlusCircle, ExternalLink, Copy, Check, MousePointerClick } from "lucide-react";

export default function LinksPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const links = [
    {
      id: "l1",
      product: "Fone de Ouvido Bluetooth Sem Fio TWS",
      marketplace: "Shopee",
      originalUrl: "https://shopee.com.br/product/123/456",
      affiliateUrl: "https://shope.ee/exemplo1",
      campaign: "Semana Tech",
      clicks: 432,
    },
    {
      id: "l2",
      product: "Fritadeira Air Fryer Digital 4L Touch",
      marketplace: "Mercado Livre",
      originalUrl: "https://mercadolivre.com.br/p/MLB12345",
      affiliateUrl: "https://mercadolivre.com/sec/exemplo2",
      campaign: "Achados Casa",
      clicks: 689,
    },
    {
      id: "l3",
      product: "Smartwatch AMOLED Esportivo Pro",
      marketplace: "Amazon",
      originalUrl: "https://amazon.com.br/dp/B08XYZ123",
      affiliateUrl: "https://amzn.to/exemplo3",
      campaign: "Prime Day",
      clicks: 814,
    },
  ];

  const handleCopy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              🔗 Gerenciador de Links Afiliados
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {links.length} links ativos
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Rastreie URLs parametrizadas, campanhas e cliques por produto.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Marketplace</th>
                <th className="py-3 px-4">Campanha</th>
                <th className="py-3 px-4">Link Afiliado</th>
                <th className="py-3 px-4 text-center">Cliques</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {link.product}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {link.marketplace}
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {link.campaign}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-600 truncate max-w-xs">
                    {link.affiliateUrl}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {link.clicks}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleCopy(link.id, link.affiliateUrl)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Copiar link"
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <a
                        href={link.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
