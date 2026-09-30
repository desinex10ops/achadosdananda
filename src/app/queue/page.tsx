"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ListOrdered,
  PlusCircle,
  Play,
  Pause,
  Trash2,
  Send,
  Clock,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
  ExternalLink,
  Download,
  Share2,
  Filter,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

interface QueueItem {
  id: string;
  status: string;
  orderIndex: number;
  scheduledFor: string | null;
  publishedAt: string | null;
  generatedText: string;
  offer: {
    id: string;
    title: string;
    currentPrice: number;
    originalPrice: number;
    discountPercentage: number;
    marketplace: { name: string };
    product: { imageUrl: string; name: string };
  };
  template: { name: string; emoji: string };
  publicationGroups: Array<{
    group: { name: string; category?: { name: string } };
  }>;
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Disparador 1-Clique WhatsApp
  const handleWhatsAppDispatch = async (item: QueueItem) => {
    try {
      // 1. Copia o texto da oferta para a área de transferência
      await navigator.clipboard.writeText(item.generatedText);
      setCopiedId(item.id);

      // 2. Abre o WhatsApp com o texto pré-carregado
      const encodedText = encodeURIComponent(item.generatedText);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const waUrl = isMobile
        ? `whatsapp://send?text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;

      window.open(waUrl, "_blank");

      // 3. Marca como publicada no banco de dados
      const res = await fetch(`/api/queue/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH_NOW" }),
      });

      if (res.ok) {
        fetchQueue();
        showToast("🚀 WhatsApp aberto e texto copiado! Oferta marcada como enviada.");
      }
    } catch (err) {
      console.error("Erro no disparo:", err);
      showToast("❌ Erro ao disparar. Verifique permissões de pop-up.");
    }
  };

  const handlePublishNow = async (id: string) => {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH_NOW" }),
      });
      if (res.ok) {
        fetchQueue();
        showToast("✅ Marcada como publicada!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePause = async (id: string, currentStatus: string) => {
    const action = currentStatus === "PAUSED" ? "RESUME" : "PAUSE";
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchQueue();
        showToast(action === "PAUSE" ? "⏸️ Oferta pausada na fila" : "▶️ Oferta reativada");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta oferta da fila?")) return;
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchQueue();
        showToast("🗑️ Oferta removida da fila");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const reordered = newItems.map((item, idx) => ({
      id: item.id,
      orderIndex: idx,
    }));

    setItems(newItems);

    await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "REORDER",
        items: reordered,
      }),
    });
  };

  const handleCopyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("📋 Texto da oferta copiado com sucesso!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `oferta-${name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("🖼️ Iniciando download da imagem do produto");
  };

  const filteredItems = items.filter((item) => {
    if (filterStatus === "ALL") return true;
    return item.status === filterStatus;
  });

  const pendingCount = items.filter((i) => i.status === "PENDING" || i.status === "SCHEDULED").length;
  const publishedCount = items.filter((i) => i.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fila de Publicações & Disparador
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {pendingCount} prontas para envio
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Envie ofertas com 1 clique para grupos do WhatsApp, organize a prioridade ou programe postagens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/offers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Adicionar Oferta à Fila</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-xs">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterStatus === "ALL" ? "bg-rose-600 text-white" : "hover:bg-slate-50"
            }`}
          >
            Todas ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterStatus === "PENDING" ? "bg-rose-600 text-white" : "hover:bg-slate-50"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("PUBLISHED")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterStatus === "PUBLISHED" ? "bg-rose-600 text-white" : "hover:bg-slate-50"
            }`}
          >
            Publicadas ({publishedCount})
          </button>
          <button
            onClick={() => setFilterStatus("PAUSED")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterStatus === "PAUSED" ? "bg-rose-600 text-white" : "hover:bg-slate-50"
            }`}
          >
            Pausadas
          </button>
        </div>

        {/* Quick batch dispatch suggestion */}
        {pendingCount > 0 && (
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Dica: Use <strong>⚡ Disparar WhatsApp</strong> para enviar a próxima oferta em 1 clique.</span>
          </div>
        )}
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ListOrdered className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Nenhuma oferta nesta visualização
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus === "ALL"
              ? "Adicione novas ofertas à fila para automatizar o fluxo de envio nos seus grupos do WhatsApp."
              : `Não há ofertas com status "${filterStatus}". Alterne os filtros acima ou crie uma nova oferta.`}
          </p>
          <Link
            href="/offers/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Criar Primeira Oferta</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const timeLabel = item.scheduledFor
              ? new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : `Posição #${index + 1}`;

            const groupsLabel =
              item.publicationGroups?.map((pg) => pg.group?.name).join(", ") || "Todos os Grupos VIP";

            const isPublished = item.status === "PUBLISHED";

            return (
              <div
                key={item.id}
                className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                  isPublished
                    ? "border-slate-200 bg-slate-50/60 opacity-80"
                    : "border-slate-200 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                {/* Left: Reorder controls + Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Reorder Buttons (only for pending) */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={index === items.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 group">
                    {item.offer?.product?.imageUrl ? (
                      <>
                        <img
                          src={item.offer.product.imageUrl}
                          alt={item.offer.title}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() =>
                            handleDownloadImage(item.offer.product.imageUrl, item.offer.title)
                          }
                          className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          title="Baixar imagem"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        ⏰ {timeLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {item.offer?.marketplace?.name}
                      </span>
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                        {item.template?.emoji} {item.template?.name}
                      </span>
                    </div>

                    <h4 className="mt-1 text-sm font-bold text-slate-900 truncate max-w-md">
                      {item.offer?.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-bold text-rose-600">
                        {formatCurrency(item.offer?.currentPrice)}
                      </span>
                      {item.offer?.originalPrice > item.offer?.currentPrice && (
                        <span className="line-through text-slate-400">
                          {formatCurrency(item.offer?.originalPrice)}
                        </span>
                      )}
                      <span>•</span>
                      <span className="truncate max-w-[220px]" title={groupsLabel}>
                        🎯 {groupsLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions and Status */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 justify-between lg:justify-end">
                  <StatusBadge status={item.status} />

                  <div className="flex items-center gap-2 ml-2">
                    {/* Copy text button */}
                    <button
                      onClick={() => handleCopyText(item.id, item.generatedText)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                      title="Copiar texto formatado com link"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    {/* Pause / Resume */}
                    <button
                      onClick={() => handleTogglePause(item.id, item.status)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                      title={item.status === "PAUSED" ? "Retomar oferta" : "Pausar oferta"}
                    >
                      {item.status === "PAUSED" ? (
                        <Play className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-amber-600" />
                      )}
                    </button>

                    {/* ONE-CLICK WHATSAPP DISPATCH BUTTON */}
                    <button
                      onClick={() => handleWhatsAppDispatch(item)}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      title="Copiar mensagem, abrir WhatsApp Web e marcar como disparada"
                    >
                      <Send className="h-3.5 w-3.5 fill-current" />
                      <span>⚡ Disparar WhatsApp</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-xs"
                      title="Remover da fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
