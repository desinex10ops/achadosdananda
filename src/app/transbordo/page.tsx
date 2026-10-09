"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  PlusCircle,
  Zap,
} from "lucide-react";

interface GroupCategory {
  id: string;
  name: string;
  slug: string;
}

interface Group {
  id: string;
  name: string;
  categoryId: string;
  category: GroupCategory;
  platform: string;
  isVipRouter: boolean;
  maxMembers: number;
  currentClicks: number;
  priority: number;
  inviteLink: string | null;
  isActive: boolean;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  source: string;
  utmSource: string | null;
  createdAt: string;
}

export default function TransbordoPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string>("ALL");
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resGroups, resCategories] = await Promise.all([
        fetch("/api/groups").then((r) => r.json()),
        fetch("/api/groups/categories").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (resGroups.success) {
        setGroups(resGroups.data.groups || []);
        if (resCategories.success && Array.isArray(resCategories.data)) {
          setCategories(resCategories.data);
        } else {
          setCategories(resGroups.data.categories || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtra grupos que participam do Roteador VIP
  const vipGroups = groups.filter((g) => g.isVipRouter);

  const displayedGroups = vipGroups.filter((g) => {
    if (selectedNiche === "ALL") return true;
    return g.categoryId === selectedNiche || g.category?.slug === selectedNiche;
  }).sort((a, b) => (a.priority || 1) - (b.priority || 1));

  // Determina qual grupo está recebendo membros agora (o primeiro que não estiver lotado)
  const activeReceivingGroup = displayedGroups.find((g) => g.currentClicks < g.maxMembers) || null;

  // Monta a URL inteligente de entrada
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const smartLink = selectedNiche === "ALL"
    ? `${origin}/api/public/vip-router`
    : `${origin}/api/public/vip-router?niche=${selectedNiche}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(smartLink);
    setCopiedLink(true);
    showToast("📋 Link inteligente copiado! Cole na bio do Instagram ou TikTok.");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleResetClicks = async (groupId: string) => {
    if (!confirm("Deseja zerar a contagem de cliques deste grupo para ele voltar ao início da fila?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentClicks: 0 }),
      });
      if (res.ok) {
        showToast("🔄 Contador de membros/cliques zerado!");
        loadData();
      }
    } catch {
      showToast("❌ Erro ao resetar contador.");
    }
  };

  const totalCapacity = displayedGroups.reduce((acc, g) => acc + (g.maxMembers || 1000), 0);
  const totalClicks = displayedGroups.reduce((acc, g) => acc + (g.currentClicks || 0), 0);
  const fullGroupsCount = displayedGroups.filter((g) => g.currentClicks >= g.maxMembers).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
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
              🌊 Monitor de Lotação & Transbordo Automático
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Roteador VIP Inteligente
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Redireciona novos seguidores automaticamente para o próximo grupo assim que o anterior lotar (1.000 membros). Nunca perca um lead por grupo cheio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-rose-600" />
            <span>Adicionar Grupo VIP</span>
          </Link>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Grupos no Roteador</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{displayedGroups.length}</span>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Neste nicho selecionado</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Cliques / Membros Totais</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{totalClicks}</span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">De {totalCapacity} vagas totais</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Grupos Lotados (Transbordados)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{fullGroupsCount}</span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Cheios</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Membros já acomodados</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Recebendo Membros Agora</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
              {activeReceivingGroup ? activeReceivingGroup.name : "Nenhum ativo"}
            </span>
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {activeReceivingGroup ? `${activeReceivingGroup.currentClicks} / ${activeReceivingGroup.maxMembers} membros` : "Todos os grupos lotados!"}
          </span>
        </div>
      </div>

      {/* GERADOR DE LINK INTELIGENTE DA BIO */}
      <div className="rounded-3xl border border-slate-900/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Link Único da Bio (Instagram & TikTok)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Coloque este link na bio do seu perfil. Quando um seguidor clicar, o sistema entrega o grupo certo que ainda tem vagas.
            </p>
          </div>

          {/* Seletor de Nicho */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">Nicho:</span>
            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">✨ Todos os Nichos (Geral)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug || c.id} className="bg-slate-900 text-white">
                  🏷️ {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Link Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-700/80">
          <input
            type="text"
            readOnly
            value={smartLink}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none select-all"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
            </button>
            <a
              href={smartLink}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1 shrink-0"
              title="Testar redirecionamento em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Testar</span>
            </a>
          </div>
        </div>
      </div>

      {/* PIPELINE EM CASCATA: FILA DE TRANSBORDO DOS GRUPOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Fila de Grupos em Ordem de Transbordo
            </h3>
            <p className="text-xs text-slate-500">
              Quando o grupo de cima atinge 100% de ocupação, o fluxo cai automaticamente para o próximo grupo abaixo.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {displayedGroups.length} grupo(s) na esteira
          </span>
        </div>

        {displayedGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-base font-bold text-slate-800">
              Nenhum grupo ativo no Roteador VIP para este nicho
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Vá em <strong>Grupos</strong> e ative a opção <em>"Participa da Auto-Rotação do Link VIP"</em> para colocar grupos nesta esteira.
            </p>
            <Link
              href="/groups"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Configurar Grupos no Roteador</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedGroups.map((group, idx) => {
              const isFull = group.currentClicks >= group.maxMembers;
              const isReceiving = activeReceivingGroup?.id === group.id;
              const percentage = Math.min(100, Math.round(((group.currentClicks || 0) / (group.maxMembers || 1000)) * 100));

              return (
                <div
                  key={group.id}
                  className={`rounded-2xl border p-5 shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isReceiving
                      ? "border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-50/10"
                      : isFull
                      ? "border-slate-200 bg-slate-50/70 opacity-80"
                      : "border-slate-200"
                  }`}
                >
                  {/* Informações do Grupo */}
                  <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isReceiving
                        ? "bg-emerald-600 text-white shadow-md animate-pulse"
                        : isFull
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      #{idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {group.category?.name}
                        </span>
                        {isReceiving ? (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 animate-pulse flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            RECEBENDO MEMBROS AGORA
                          </span>
                        ) : isFull ? (
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            🔴 LOTADO (TRANSBORDOU)
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            ⚪ NA FILA DE ESPERA
                          </span>
                        )}
                      </div>

                      <h4 className="mt-1 text-sm font-bold text-slate-900 truncate">
                        {group.name}
                      </h4>

                      {/* Barra de Progresso de Membros */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium text-[11px]">
                            Lotação: <strong>{group.currentClicks}</strong> de {group.maxMembers} membros
                          </span>
                          <span className="font-bold text-slate-700 text-[11px]">{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull
                                ? "bg-rose-500"
                                : isReceiving
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 justify-end">
                    {group.inviteLink && (
                      <a
                        href={group.inviteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Ver link do grupo"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleResetClicks(group.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors flex items-center gap-1"
                      title="Zerar contagem de membros para reabrir vagas"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                      <span>Resetar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
