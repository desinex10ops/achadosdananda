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
    product: { imageUrl: string; name: string; category?: string };
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
  const [selectedNiche, setSelectedNiche] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Piloto Automático / Auto-Disparador
  const [isAutoPostActive, setIsAutoPostActive] = useState(false);
  const [autoPostInterval, setAutoPostInterval] = useState(15); // minutos
  const [countdown, setCountdown] = useState(15 * 60);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (visibleItems: QueueItem[]) => {
    if (selectedIds.size === visibleItems.length && visibleItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleItems.map((i) => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Tem certeza que deseja apagar as ${count} ofertas selecionadas da fila?`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await fetch("/api/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
        showToast(`🗑️ ${count} oferta(s) removida(s) da fila com sucesso!`);
      } else {
        showToast(`❌ Erro: ${data.error || "Falha ao apagar ofertas"}`);
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Erro de conexão ao apagar.");
    } finally {
      setIsDeletingBulk(false);
    }
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

  // Execução do Piloto Automático no Navegador
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPostActive) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            const nextPending = items.find((i) => i.status === "PENDING" || i.status === "SCHEDULED");
            if (nextPending) {
              handleWhatsAppDispatch(nextPending);
            } else {
              setIsAutoPostActive(false);
              showToast("🎉 Todas as ofertas da fila foram disparadas!");
            }
            return autoPostInterval * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoPostActive, items, autoPostInterval]);

  const toggleAutoPost = () => {
    if (!isAutoPostActive) {
      const pending = items.filter((i) => i.status === "PENDING" || i.status === "SCHEDULED");
      if (pending.length === 0) {
        showToast("⚠️ Nenhuma oferta pendente na fila para disparar.");
        return;
      }
      
      // Dispara a 1ª oferta imediatamente!
      const nextPending = pending[0];
      handleWhatsAppDispatch(nextPending);

      setCountdown(autoPostInterval * 60);
      setIsAutoPostActive(true);
      showToast(`🤖 Piloto Automático ativado! 1ª oferta disparada agora. Próximas a cada ${autoPostInterval} min.`);
    } else {
      setIsAutoPostActive(false);
      showToast("⏸️ Piloto Automático pausado.");
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
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (selectedNiche !== "ALL") {
      const cat = (
        item.publicationGroups[0]?.group?.category?.name ||
        item.offer?.product?.category ||
        item.offer?.title ||
        ""
      ).toLowerCase();
      
      if (selectedNiche === "MODA" && !cat.includes("moda") && !cat.includes("beleza") && !cat.includes("roupa") && !cat.includes("vest") && !cat.includes("batom") && !cat.includes("perfum")) return false;
      if (selectedNiche === "CASA" && !cat.includes("casa") && !cat.includes("cozinha") && !cat.includes("panela") && !cat.includes("decor") && !cat.includes("air fryer") && !cat.includes("cama")) return false;
      if (selectedNiche === "TECH" && !cat.includes("tech") && !cat.includes("fone") && !cat.includes("celular") && !cat.includes("gamer") && !cat.includes("monitor") && !cat.includes("pc")) return false;
      if (selectedNiche === "BEBE" && !cat.includes("bebê") && !cat.includes("bebe") && !cat.includes("fralda") && !cat.includes("infantil") && !cat.includes("criança")) return false;
      if (selectedNiche === "MERCADO" && !cat.includes("mercado") && !cat.includes("limpeza") && !cat.includes("pet") && !cat.includes("ração") && !cat.includes("sabão")) return false;
    }
    return true;
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

      {/* Painel do Piloto Automático / Auto-Disparador */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 p-5 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                isAutoPostActive
                  ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50 animate-pulse"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">🤖 Piloto Automático da Fila</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isAutoPostActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isAutoPostActive ? "ATIVO & DISPARANDO" : "PAUSADO"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispara automaticamente as {pendingCount} ofertas no grupo <strong>PROMO MODA & BELEZA #4</strong> respeitando intervalos anti-ban.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Seletor de Intervalo */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-300">Intervalo:</span>
              <select
                value={autoPostInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAutoPostInterval(val);
                  setCountdown(val * 60);
                }}
                disabled={isAutoPostActive}
                className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-slate-900 text-white">5 min (teste rápido)</option>
                <option value={10} className="bg-slate-900 text-white">10 min</option>
                <option value={15} className="bg-slate-900 text-white">15 min (recomendado)</option>
                <option value={20} className="bg-slate-900 text-white">20 min</option>
                <option value={30} className="bg-slate-900 text-white">30 min (super seguro)</option>
              </select>
            </div>

            {/* Contador regressivo se ativo */}
            {isAutoPostActive && (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold">
                <Clock className="h-4 w-4 animate-spin text-emerald-400" />
                <span>Próximo em: {formatCountdown(countdown)}</span>
              </div>
            )}

            {/* Botão de Toggle */}
            <button
              onClick={toggleAutoPost}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 ${
                isAutoPostActive
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25"
              }`}
            >
              {isAutoPostActive ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>Pausar Piloto Automático</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Iniciar Piloto Automático</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de Nichos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold mr-1 shrink-0">Filtrar por Nicho:</span>
        {[
          { id: "ALL", label: "Todos os Nichos", emoji: "✨" },
          { id: "MODA", label: "Moda & Beleza", emoji: "👗" },
          { id: "CASA", label: "Casa & Cozinha", emoji: "🏠" },
          { id: "TECH", label: "Tech & Setup", emoji: "💻" },
          { id: "BEBE", label: "Bebê & Infantil", emoji: "🍼" },
          { id: "MERCADO", label: "Mercado & Pet", emoji: "🛒" },
        ].map((niche) => (
          <button
            key={niche.id}
            onClick={() => setSelectedNiche(niche.id)}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedNiche === niche.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{niche.emoji}</span>
            <span>{niche.label}</span>
          </button>
        ))}
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

      {/* Selection & Bulk Actions Bar */}
      {filteredItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                onChange={() => toggleSelectAll(filteredItems)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>
                {selectedIds.size === 0
                  ? "Selecionar todos"
                  : `${selectedIds.size} de ${filteredItems.length} selecionado(s)`}
              </span>
            </label>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Limpar seleção
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {isDeletingBulk ? "Apagando..." : `Apagar Selecionados (${selectedIds.size})`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

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
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                  isSelected
                    ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/40"
                    : isPublished
                    ? "border-slate-200 bg-slate-50/60 opacity-80"
                    : "border-slate-200 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                {/* Left: Checkbox + Reorder controls + Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Select Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                    title="Selecionar esta oferta"
                  />

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
