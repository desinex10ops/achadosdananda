"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  Package,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/queue");
        const json = await res.json();
        if (json.success) {
          setHistory(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Histórico de Publicações
          </h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Registro Completo
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe todos os disparos realizados, horários de envio e desempenho por oferta.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Nenhum registro de publicação no histórico ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Data / Horário</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Marketplace</th>
                  <th className="py-3 px-4">Grupo de Destino</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const dateStr = item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                    : item.scheduledFor
                    ? new Date(item.scheduledFor).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                    : new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.offer?.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.offer?.marketplace?.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.publicationGroups?.map((pg: any) => pg.group?.name).join(", ") || "Geral"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          {item.template?.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
