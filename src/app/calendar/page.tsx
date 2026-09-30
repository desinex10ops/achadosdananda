"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

interface ScheduledItem {
  id: string;
  status: string;
  scheduledFor: string | null;
  offer: {
    title: string;
    currentPrice: number;
    marketplace: { name: string };
    product: { imageUrl: string };
  };
  template: { name: string; emoji: string };
  publicationGroups: Array<{ group: { name: string } }>;
}

export default function CalendarPage() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScheduled() {
      try {
        const res = await fetch("/api/queue");
        const json = await res.json();
        if (json.success) {
          setItems(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadScheduled();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              📅 Agenda de Publicações
            </h1>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              Cronograma
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Planejamento cronológico de envios automáticos para os grupos de ofertas.
          </p>
        </div>

        <Link
          href="/offers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Agendar Nova Oferta</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Timeline de Envios Programados
            </h3>
            <span className="text-xs text-slate-500">
              Horário de Brasília (GMT-3)
            </span>
          </div>

          <div className="relative border-l border-slate-200 ml-4 space-y-6 py-2">
            {items.map((item, idx) => {
              const timeString = item.scheduledFor
                ? new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : `Lote ${idx + 1}`;

              return (
                <div key={item.id} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow-xs" />

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all hover:bg-slate-50 hover:shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                          ⏰ {timeString}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {item.offer.marketplace?.name}
                        </span>
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          {item.template.emoji} {item.template.name}
                        </span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-900">
                      {item.offer.title}
                    </h4>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-rose-600">
                        {formatCurrency(item.offer.currentPrice)}
                      </span>
                      <span>•</span>
                      <span>
                        Destino: {item.publicationGroups.map((g) => g.group.name).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
