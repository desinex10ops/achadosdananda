"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Settings,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Play,
} from "lucide-react";

interface MirrorRule {
  id: string;
  sourceGroupName: string;
  sourceGroupId?: string | null;
  targetGroupId?: string | null;
  targetGroupName: string;
  style: "CLONE" | "TEMPLATE";
  mediaFormat: "IMAGE" | "PREVIEW";
  intervalMinutes: number;
  filterOfficialOnly: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  platform: string;
}

export default function EspelhamentoPage() {
  const [rules, setRules] = useState<MirrorRule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [sourceGroupName, setSourceGroupName] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetGroupName, setTargetGroupName] = useState("");
  const [style, setStyle] = useState<"CLONE" | "TEMPLATE">("CLONE");
  const [mediaFormat, setMediaFormat] = useState<"IMAGE" | "PREVIEW">("PREVIEW");
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [filterOfficialOnly, setFilterOfficialOnly] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  // Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testInputText, setTestInputText] = useState(
    "🚨 SUPER OFERTA RELÂMPAGO!\n\nMonitor Gamer LG UltraGear 27'' FHD 144Hz\nDe: R$ 1.099,00\nPor: R$ 797,00 (27% OFF!)\n\nCompre aqui com cupom:\nhttps://www.mercadolivre.com.br/monitor-gamer-lg-ultragear-27/p/MLB123456\n\nFrete Grátis FULL! 🔥"
  );
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRules, resGroups] = await Promise.all([
        fetch("/api/mirror/rules").then((r) => r.json()),
        fetch("/api/groups").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (resRules.success) {
        setRules(resRules.data || []);
      }
      if (resGroups && resGroups.data) {
        const groupList: Group[] = Array.isArray(resGroups.data)
          ? resGroups.data
          : Array.isArray(resGroups.data.groups)
          ? resGroups.data.groups
          : [];
        setGroups(groupList);
        if (groupList.length > 0 && !targetGroupId) {
          setTargetGroupId(groupList[0].id);
          setTargetGroupName(groupList[0].name);
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

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceGroupName.trim()) {
      showToast("Informe o nome do grupo a ser monitorado/clonado.");
      return;
    }

    const targetName =
      targetGroupName ||
      groups.find((g) => g.id === targetGroupId)?.name ||
      "Meu Grupo VIP";

    setSavingRule(true);
    try {
      const res = await fetch("/api/mirror/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGroupName: sourceGroupName.trim(),
          targetGroupId: targetGroupId || null,
          targetGroupName: targetName,
          style,
          mediaFormat,
          intervalMinutes,
          filterOfficialOnly,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast("✅ Regra de espelhamento criada com sucesso!");
        setSourceGroupName("");
        loadData();
      } else {
        showToast("❌ Erro ao criar regra: " + json.error);
      }
    } catch {
      showToast("❌ Falha ao salvar regra de espelhamento.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/mirror/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setRules(rules.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)));
        showToast(`Regra ${!currentStatus ? "ativada" : "pausada"} com sucesso.`);
      }
    } catch {
      showToast("Falha ao atualizar regra.");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra de espelhamento?")) return;
    try {
      const res = await fetch(`/api/mirror/rules?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setRules(rules.filter((r) => r.id !== id));
        showToast("Regra removida.");
      }
    } catch {
      showToast("Falha ao excluir regra.");
    }
  };

  const handleRunTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/mirror/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGroupName: "Grupo Concorrente",
          originalText: testInputText,
        }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      showToast("Erro ao testar: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white font-medium px-5 py-3 rounded-xl shadow-2xl border border-orange-400/30 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-orange-500 animate-pulse" />
            ((•)) Espelhamento de Ofertas
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Espelhe e clone ofertas de grupos monitorados do WhatsApp, substituindo os links automaticamente pelos seus de afiliado.
          </p>
        </div>

        <button
          onClick={() => {
            setIsTestModalOpen(true);
            setTestResult(null);
          }}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Simular / Testar Clonagem
        </button>
      </div>

      {/* Regra de Espelhamento Banner de Alerta */}
      <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 mb-8 flex items-start gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b>Regra de Espelhamento:</b> Somente links oficiais das lojas são espelhados (Shopee, Mercado Livre, Amazon e Magalu). Links encurtados, redirecionados ou de sites terceiros não serão processados para proteger seus grupos contra links inválidos ou spam.
        </p>
      </div>

      {/* Formulário Principal (Grid 2 Colunas igual à Imagem 5) */}
      <form onSubmit={handleCreateRule} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        {/* Coluna Esquerda: Monitorar Novos Grupos (8 cols) */}
        <div className="lg:col-span-7 bg-[#121215] border border-zinc-800/90 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
              <Share2 className="w-4 h-4 text-orange-500" />
              Monitorar Novos Grupos
            </h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Grupos Monitorados (Origem) */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  📢 GRUPOS MONITORADOS (ORIGEM)
                </label>
                <input
                  type="text"
                  placeholder="Nome do grupo para monitorar (ex: Achadinhos VIP)"
                  value={sourceGroupName}
                  onChange={(e) => setSourceGroupName(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/80 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Grupo do concorrente ou canal de onde as ofertas serão copiadas.
                </span>
              </div>

              {/* Seta Indicadora */}
              <div className="self-center sm:mt-5 text-orange-500">
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* Grupos Destino (Envio) */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  🎯 GRUPOS DESTINO (ENVIO)
                </label>
                <select
                  value={targetGroupId}
                  onChange={(e) => {
                    setTargetGroupId(e.target.value);
                    const found = Array.isArray(groups) ? groups.find((g) => g.id === e.target.value) : undefined;
                    if (found) setTargetGroupName(found.name);
                  }}
                  className="w-full bg-zinc-900/90 border border-zinc-700/80 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                >
                  {!Array.isArray(groups) || groups.length === 0 ? (
                    <option value="">Nenhum grupo cadastrado (crie em Grupos)</option>
                  ) : (
                    groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.platform})
                      </option>
                    ))
                  )}
                </select>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Seu grupo VIP que receberá a oferta com seu link de afiliado.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <span>Filtro de links oficiais ativo por padrão.</span>
            <button
              type="submit"
              disabled={savingRule}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-950/40 disabled:opacity-50"
            >
              {savingRule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Regra de Espelhamento
            </button>
          </div>
        </div>

        {/* Coluna Direita: Configurações de Estilo & Mídia (5 cols) */}
        <div className="lg:col-span-5 bg-[#121215] border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-500" />
            Configurações
          </h2>

          {/* Estilo: Template vs Clone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300">Estilo:</label>
              <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStyle("TEMPLATE")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    style === "TEMPLATE"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  T Template
                </button>
                <button
                  type="button"
                  onClick={() => setStyle("CLONE")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    style === "CLONE"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📎 Clone
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
              {style === "CLONE" ? (
                <>
                  <b className="text-indigo-400">Modo Clone:</b> Usará exatamente a mensagem original do grupo espelhado, trocando apenas os links de afiliado para as suas tags oficiais.
                </>
              ) : (
                <>
                  <b className="text-zinc-200">Modo Template:</b> Formatá a oferta usando o modelo de mensagem configurado no seu sistema.
                </>
              )}
            </p>
          </div>

          {/* Formato de Mídia: Imagem vs Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300">Formato de Mídia:</label>
              <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMediaFormat("IMAGE")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mediaFormat === "IMAGE"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" /> Imagem
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFormat("PREVIEW")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    mediaFormat === "PREVIEW"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" /> Preview
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
              {mediaFormat === "IMAGE" ? (
                <>
                  <b className="text-zinc-200">Imagem:</b> Enviará a oferta com a foto do produto como imagem anexada que ocupa espaço na galeria do usuário.
                </>
              ) : (
                <>
                  <b className="text-indigo-400">Preview:</b> Exibirá uma amostra do link em tamanho padrão com visual moderno sem ocupar a galeria.
                </>
              )}
            </p>
          </div>
        </div>
      </form>

      {/* Regras Ativas Cadastradas */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Regras de Espelhamento Ativas
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {rules.length}
            </span>
          </h2>
          <button
            onClick={loadData}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Radio className="w-10 h-10 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-zinc-400">Nenhuma regra de espelhamento configurada</p>
            <p className="text-xs mt-1">Preencha o formulário acima para espelhar um grupo concorrente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.isActive)}
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      rule.isActive ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-zinc-600"
                    }`}
                    title={rule.isActive ? "Regra Ativa (clique para pausar)" : "Pausada"}
                  />

                  {/* Fluxo Origem -> Destino */}
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="text-zinc-300">📢 {rule.sourceGroupName}</span>
                    <ArrowRight className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-emerald-400">🎯 {rule.targetGroupName}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 font-semibold text-[10px]">
                      {rule.style === "CLONE" ? "📎 CLONE DE LINKS" : "T TEMPLATE"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px]">
                      {rule.mediaFormat === "IMAGE" ? "🖼️ Imagem" : "👁️ Preview"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setIsTestModalOpen(true);
                      setTestInputText(
                        `Oferta exclusiva encontrada no grupo ${rule.sourceGroupName}!\n\nConfira este produto imperdível:\nhttps://www.mercadolivre.com.br/produto-teste/p/MLB999\n\nAproveite!`
                      );
                      setTestResult(null);
                    }}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    Simular
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors"
                    title="Excluir regra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE SIMULAÇÃO / TESTE DE CLONAGEM */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Play className="w-5 h-5 text-emerald-400" />
              Simulador de Clonagem de Oferta
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Cole abaixo uma mensagem de um grupo concorrente para ver em tempo real como o sistema troca os links originais pelos seus de afiliado mantendo toda a formatação!
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Mensagem Original do Concorrente:
                </label>
                <textarea
                  rows={4}
                  value={testInputText}
                  onChange={(e) => setTestInputText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Processar e Substituir Links
              </button>

              {testResult && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {testResult.replacedLinksCount} link(s) substituído(s) com sucesso!
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(testResult.clonedText);
                        showToast("Mensagem clonada copiada!");
                      }}
                      className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar Resultado
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      Mensagem Pronta para Envio no seu Grupo:
                    </label>
                    <pre className="bg-zinc-950 p-3 rounded-lg text-xs text-zinc-200 whitespace-pre-wrap font-sans border border-zinc-800">
                      {testResult.clonedText}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
