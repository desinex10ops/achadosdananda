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
  Calendar,
  Edit3,
  X,
  Zap,
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
    group: { name: string; category?: { name: string }; whatsappJid?: string | null };
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
  const [autoPostInterval, setAutoPostInterval] = useState(8); // minutos
  const [countdown, setCountdown] = useState(8 * 60);

  // Estado de envio direto na nuvem por item
  const [isDispatchingDirect, setIsDispatchingDirect] = useState<string | null>(null);

  // Modal de Edição de Horário Individual
  const [editingScheduleItem, setEditingScheduleItem] = useState<QueueItem | null>(null);
  const [newScheduleDateTime, setNewScheduleDateTime] = useState<string>("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Modal de Reagendamento em Lote
  const [isBulkRescheduleOpen, setIsBulkRescheduleOpen] = useState(false);
  const [bulkStartTime, setBulkStartTime] = useState<string>("");
  const [bulkIntervalMinutes, setBulkIntervalMinutes] = useState(8);
  const [isSavingBulkSchedule, setIsSavingBulkSchedule] = useState(false);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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

  const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);

  const fetchAutopilotStatus = async () => {
    try {
      // 1. Lê do localStorage primeiro para resposta instantânea na tela sem piscar
      if (typeof window !== "undefined") {
        const cachedActive = localStorage.getItem("autopilot_active") === "true";
        const cachedInterval = Number(localStorage.getItem("autopilot_interval"));
        if (cachedActive) {
          setIsAutoPostActive(true);
          if (cachedInterval) setAutoPostInterval(cachedInterval);
        }
      }

      // 2. Sincroniza com o banco de dados no servidor
      const res = await fetch("/api/queue/autopilot");
      const json = await res.json();
      if (json.success && json.data) {
        const { isActive, intervalMinutes, nextScheduledTime } = json.data;
        setIsAutoPostActive(isActive);
        if (intervalMinutes) setAutoPostInterval(intervalMinutes);

        if (typeof window !== "undefined") {
          localStorage.setItem("autopilot_active", isActive ? "true" : "false");
          localStorage.setItem("autopilot_interval", String(intervalMinutes || 8));
        }

        if (isActive && nextScheduledTime) {
          const diffSeconds = Math.max(
            0,
            Math.floor((new Date(nextScheduledTime).getTime() - Date.now()) / 1000)
          );
          setCountdown(diffSeconds > 0 ? diffSeconds : (intervalMinutes || 8) * 60);
        }
      }
    } catch (err) {
      console.error("Erro ao verificar status do piloto automático:", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchAutopilotStatus();
  }, []);

  // 1. DISPARO 100% DIRETO PARA O GRUPO NO WHATSAPP (SEM ABRIR JANELAS)
  const handleDirectServerDispatch = async (item: QueueItem) => {
    setIsDispatchingDirect(item.id);
    try {
      const res = await fetch("/api/distribution/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationId: item.id,
          platform: "EVOLUTION",
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.success) {
        showToast("🚀 Oferta enviada com sucesso diretamente para o grupo no WhatsApp!");
        fetchQueue();
      } else {
        const errorMsg = data.data?.errorMessage || data.error || "Verifique se o bot está conectado";
        showToast(`⚠️ Envio direto: ${errorMsg}`);
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Falha de rede ao disparar oferta.");
    } finally {
      setIsDispatchingDirect(null);
    }
  };

  // 2. DISPARO MANUAL (COPIAR E ABRIR WHATSAPP WEB COMO FALLBACK)
  const handleWhatsAppManualDispatch = async (item: QueueItem) => {
    try {
      await navigator.clipboard.writeText(item.generatedText);
      setCopiedId(item.id);

      const encodedText = encodeURIComponent(item.generatedText);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const waUrl = isMobile
        ? `whatsapp://send?text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;

      window.open(waUrl, "_blank");

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
      showToast("❌ Erro ao abrir WhatsApp.");
    }
  };

  // 3. EXECUÇÃO DO PILOTO AUTOMÁTICO NA NUVEM COM CONTAGEM REGRESSIVA EM TEMPO REAL
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPostActive) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Aciona o disparador da nuvem para enviar a oferta do horário
            fetch("/api/cron/process-queue")
              .then((res) => res.json())
              .then((data) => {
                if (data.processed > 0) {
                  showToast("🚀 Oferta da fila disparada com sucesso no grupo do WhatsApp!");
                }
                fetchQueue();
              })
              .catch((e) => console.error(e));

            return autoPostInterval * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoPostActive, autoPostInterval]);

  const toggleAutoPost = async () => {
    if (isAutopilotLoading) return;
    setIsAutopilotLoading(true);

    if (!isAutoPostActive) {
      const pending = items.filter((i) => i.status === "PENDING" || i.status === "SCHEDULED");
      if (pending.length === 0) {
        showToast("⚠️ Nenhuma oferta pendente na fila para disparar.");
        setIsAutopilotLoading(false);
        return;
      }

      showToast("⏳ Ativando Piloto Automático 24/7 no servidor...");
      setIsAutoPostActive(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("autopilot_active", "true");
        localStorage.setItem("autopilot_interval", String(autoPostInterval));
      }

      try {
        const res = await fetch("/api/queue/autopilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "START",
            intervalMinutes: autoPostInterval,
            sendFirstImmediately: true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`🚀 Piloto Automático 24/7 ativado! Grade salva na nuvem. Os disparos continuarão mesmo com o computador desligado.`);
          setCountdown(autoPostInterval * 60);
          fetchQueue();
        } else {
          showToast(`❌ Erro: ${data.error || "Falha ao ativar piloto"}`);
          setIsAutoPostActive(false);
          if (typeof window !== "undefined") localStorage.removeItem("autopilot_active");
        }
      } catch (err) {
        console.error(err);
        showToast("❌ Erro de conexão ao ativar piloto automático.");
      } finally {
        setIsAutopilotLoading(false);
      }
    } else {
      setIsAutoPostActive(false);
      if (typeof window !== "undefined") localStorage.removeItem("autopilot_active");

      try {
        await fetch("/api/queue/autopilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "PAUSE" }),
        });
        showToast("⏸️ Piloto Automático pausado no servidor.");
        fetchQueue();
      } catch (err) {
        console.error(err);
      } finally {
        setIsAutopilotLoading(false);
      }
    }
  };

  // 4. EDIÇÃO DE HORÁRIO INDIVIDUAL
  const handleOpenEditSchedule = (item: QueueItem) => {
    setEditingScheduleItem(item);
    if (item.scheduledFor) {
      const d = new Date(item.scheduledFor);
      const pad = (n: number) => String(n).padStart(2, "0");
      const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setNewScheduleDateTime(localStr);
    } else {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setNewScheduleDateTime(localStr);
    }
  };

  const handleApplyQuickOffset = (minutes: number) => {
    const base = new Date();
    base.setMinutes(base.getMinutes() + minutes);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
    setNewScheduleDateTime(localStr);
  };

  const handleApplyFixedHour = (hour: number, minute: number, isTomorrow: boolean = false) => {
    const target = new Date();
    if (isTomorrow) target.setDate(target.getDate() + 1);
    target.setHours(hour, minute, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
    setNewScheduleDateTime(localStr);
  };

  const handleSaveSchedule = async () => {
    if (!editingScheduleItem || !newScheduleDateTime) return;
    setIsSavingSchedule(true);
    try {
      const selectedDate = new Date(newScheduleDateTime);
      const res = await fetch(`/api/queue/${editingScheduleItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: selectedDate.toISOString(),
          status: "SCHEDULED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⏰ Horário alterado para ${selectedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}!`);
        setEditingScheduleItem(null);
        fetchQueue();
      } else {
        showToast(`❌ Erro: ${data.error || "Falha ao salvar horário"}`);
      }
    } catch (err) {
      showToast("❌ Erro de conexão.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // 5. REAGENDAMENTO EM LOTE
  const handleOpenBulkReschedule = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setBulkStartTime(localStr);
    setIsBulkRescheduleOpen(true);
  };

  const handleSaveBulkReschedule = async () => {
    if (!bulkStartTime) return;
    const targetItems = selectedIds.size > 0
      ? items.filter((i) => selectedIds.has(i.id))
      : items.filter((i) => i.status === "PENDING" || i.status === "SCHEDULED");

    if (targetItems.length === 0) {
      showToast("⚠️ Nenhuma oferta selecionada para reagendar.");
      return;
    }

    setIsSavingBulkSchedule(true);
    try {
      let currentTime = new Date(bulkStartTime);
      for (const item of targetItems) {
        await fetch(`/api/queue/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledFor: currentTime.toISOString(),
            status: "SCHEDULED",
          }),
        });
        currentTime.setMinutes(currentTime.getMinutes() + bulkIntervalMinutes);
      }

      showToast(`🎉 ${targetItems.length} ofertas reagendadas com intervalo de ${bulkIntervalMinutes} min!`);
      setIsBulkRescheduleOpen(false);
      fetchQueue();
    } catch (err) {
      showToast("❌ Erro ao reagendar em lote.");
    } finally {
      setIsSavingBulkSchedule(false);
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
            Envie ofertas diretamente para o grupo no WhatsApp, edite horários de envio ou ative o piloto automático.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenBulkReschedule}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-rose-600" />
            <span>Reagendar Fila em Massa</span>
          </button>
          <Link
            href="/offers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Oferta</span>
          </Link>
        </div>
      </div>

      {/* Painel do Piloto Automático */}
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
                <h2 className="text-base font-bold text-white">🤖 Piloto Automático 24/7 (Disparo Direto na Nuvem)</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isAutoPostActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isAutoPostActive ? "ATIVO NA NUVEM 24/7 (NÃO PAUSA)" : "PAUSADO"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispara as ofertas via servidor na nuvem. <strong>Continua funcionando mesmo com o computador desligado</strong> e <strong>não pausa ao atualizar a página</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
                <option value={8} className="bg-slate-900 text-white">8 min (programado p/ 100 ofertas)</option>
                <option value={10} className="bg-slate-900 text-white">10 min</option>
                <option value={15} className="bg-slate-900 text-white">15 min</option>
              </select>
            </div>

            {isAutoPostActive && (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold">
                <Clock className="h-4 w-4 animate-spin text-emerald-400" />
                <span>Próximo em: {formatCountdown(countdown)}</span>
              </div>
            )}

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

        {pendingCount > 0 && (
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Clique no horário <strong>⏰ 08:30</strong> de qualquer oferta para editá-lo!</span>
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
                onClick={handleOpenBulkReschedule}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-900 transition-all active:scale-95"
              >
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Reagendar Selecionadas ({selectedIds.size})</span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeletingBulk ? "Apagando..." : `Apagar (${selectedIds.size})`}</span>
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
              ? "Adicione novas ofertas à fila para automatizar o envio nos seus grupos do WhatsApp."
              : `Não há ofertas com status "${filterStatus}". Alterne os filtros acima.`}
          </p>
          <Link
            href="/offers/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Criar Oferta</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const timeLabel = item.scheduledFor
              ? new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : `Posição #${index + 1}`;

            const dateLabel = item.scheduledFor
              ? new Date(item.scheduledFor).toLocaleDateString([], { day: "2-digit", month: "2-digit" })
              : "";

            const groupsLabel =
              item.publicationGroups?.map((pg) => pg.group?.name).join(", ") || "PROMO MODA & BELEZA #4";

            const isPublished = item.status === "PUBLISHED";
            const isSelected = selectedIds.has(item.id);
            const isSendingThis = isDispatchingDirect === item.id;

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
                {/* Left: Checkbox + Controls + Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                    title="Selecionar esta oferta"
                  />

                  {/* Reorder Buttons */}
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
                      {/* BOTÃO EDITAR HORÁRIO CLICÁVEL */}
                      <button
                        onClick={() => handleOpenEditSchedule(item)}
                        className="rounded-lg bg-slate-100 hover:bg-rose-50 hover:border-rose-300 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-rose-600 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer"
                        title="Clique para editar o horário exato desta oferta"
                      >
                        <Clock className="h-3.5 w-3.5 text-slate-500 group-hover:text-rose-600" />
                        <span>{timeLabel} {dateLabel && `(${dateLabel})`}</span>
                        <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500" />
                      </button>

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
                    {/* Botão Editar Horário */}
                    <button
                      onClick={() => handleOpenEditSchedule(item)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                      title="Alterar data/hora de envio"
                    >
                      <Clock className="h-4 w-4" />
                    </button>

                    {/* Copiar texto */}
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

                    {/* 🚀 BOTÃO DISPARO DIRETO NO GRUPO (NUVEM 100% AUTOMÁTICO) */}
                    <button
                      onClick={() => handleDirectServerDispatch(item)}
                      disabled={isSendingThis}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title="Enviar diretamente para o grupo no WhatsApp pelo servidor sem abrir janelas"
                    >
                      {isSendingThis ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 fill-current" />
                          <span>🚀 Enviar Direto no Grupo</span>
                        </>
                      )}
                    </button>

                    {/* Opção Manual Secundária */}
                    <button
                      onClick={() => handleWhatsAppManualDispatch(item)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-xs"
                      title="Abrir WhatsApp Web manualmente como alternativa"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>

                    {/* Excluir */}
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

      {/* MODAL 1: EDITAR HORÁRIO INDIVIDUAL */}
      {editingScheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Editar Horário de Envio</h3>
              </div>
              <button
                onClick={() => setEditingScheduleItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 truncate mb-2">
                {editingScheduleItem.offer.title}
              </p>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Data e Horário do Envio:
              </label>
              <input
                type="datetime-local"
                value={newScheduleDateTime}
                onChange={(e) => setNewScheduleDateTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Atalhos Rápidos */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Atalhos Rápidos:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleApplyQuickOffset(5)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 py-1.5 font-semibold text-slate-700"
                >
                  +5 min
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickOffset(15)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 py-1.5 font-semibold text-slate-700"
                >
                  +15 min
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickOffset(30)}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 py-1.5 font-semibold text-slate-700"
                >
                  +30 min
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFixedHour(8, 30, true)}
                  className="rounded-lg bg-rose-50 hover:bg-rose-100 py-1.5 font-semibold text-rose-700"
                >
                  Amanhã 08:30
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFixedHour(12, 0, true)}
                  className="rounded-lg bg-rose-50 hover:bg-rose-100 py-1.5 font-semibold text-rose-700"
                >
                  Amanhã 12:00
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFixedHour(19, 0, true)}
                  className="rounded-lg bg-rose-50 hover:bg-rose-100 py-1.5 font-semibold text-rose-700"
                >
                  Amanhã 19:00
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingScheduleItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {isSavingSchedule ? "Salvando..." : "Salvar Horário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REAGENDAMENTO EM LOTE */}
      {isBulkRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">Reagendar Fila em Massa</h3>
              </div>
              <button
                onClick={() => setIsBulkRescheduleOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Defina o horário inicial e o intervalo para reprogramar as{" "}
              <strong>
                {selectedIds.size > 0 ? `${selectedIds.size} selecionadas` : `${pendingCount} ofertas da fila`}
              </strong>{" "}
              em sequência automática.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horário da 1ª Oferta:
                </label>
                <input
                  type="datetime-local"
                  value={bulkStartTime}
                  onChange={(e) => setBulkStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intervalo entre cada envio (minutos):
                </label>
                <select
                  value={bulkIntervalMinutes}
                  onChange={(e) => setBulkIntervalMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 minutos (envio rápido)</option>
                  <option value={8}>8 minutos (recomendado p/ 100 ofertas)</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkRescheduleOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBulkReschedule}
                disabled={isSavingBulkSchedule}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {isSavingBulkSchedule ? "Reagendando..." : "Aplicar na Fila"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
