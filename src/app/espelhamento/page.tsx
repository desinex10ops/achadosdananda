"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Radio,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Settings,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Play,
  Send,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Zap,
  Terminal,
  Link2,
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
  whatsappJid?: string | null;
}

interface HeadlessGroup {
  jid: string;
  name: string;
  size: number;
  isRecommendedSource: boolean;
  isRecommendedTarget: boolean;
}

interface CapturedOffer {
  messageId: string;
  remoteJid: string;
  timestamp: number;
  hasImage: boolean;
  title: string;
  originalText: string;
  clonedText: string;
  replacedLinks: {
    originalUrl: string;
    resolvedUrl?: string;
    affiliateUrl: string;
    store: string;
  }[];
}

export default function EspelhamentoPage() {
  const [rules, setRules] = useState<MirrorRule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Headless WhatsApp State
  const [headlessConnected, setHeadlessConnected] = useState<boolean>(true);
  const [headlessInstance, setHeadlessInstance] = useState<string>("nanda-principal");
  const [headlessGroups, setHeadlessGroups] = useState<HeadlessGroup[]>([]);
  const [selectedSourceJid, setSelectedSourceJid] = useState<string>("120363425588077327@g.us");
  const [selectedTargetJid, setSelectedTargetJid] = useState<string>("120363429708443665@g.us");
  const [capturedOffers, setCapturedOffers] = useState<CapturedOffer[]>([]);
  const [loadingHeadless, setLoadingHeadless] = useState<boolean>(true);
  const [sendWithImage, setSendWithImage] = useState<boolean>(true);
  const [sendingMsgId, setSendingMsgId] = useState<string | null>(null);
  const [sendingBatch, setSendingBatch] = useState<boolean>(false);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  // QR Code Modal State (para conectar/trocar WhatsApp no navegador oculto)
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);

  // Form State (Regras Automáticas)
  const [sourceGroupName, setSourceGroupName] = useState("");
  const [sourceGroupId, setSourceGroupId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetGroupName, setTargetGroupName] = useState("");
  const [style, setStyle] = useState<"CLONE" | "TEMPLATE">("CLONE");
  const [mediaFormat, setMediaFormat] = useState<"IMAGE" | "PREVIEW">("IMAGE");
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [filterOfficialOnly, setFilterOfficialOnly] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  // Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testInputText, setTestInputText] = useState(
    "*Achadinho Imperdível no Mercado Livre!* 😍\n\nEscova Secadora Britânia Soft Bec02 1200W\n🔥 Por apenas *R$ 109,90*\n\n🛒 Compre aqui:\nhttps://meli.la/1n5tE3r"
  );
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadHeadlessFeed = useCallback(
    async (srcJid?: string) => {
      const targetSrc = srcJid || selectedSourceJid;
      setLoadingHeadless(true);
      try {
        const res = await fetch(
          `/api/mirror/headless?sourceJid=${encodeURIComponent(targetSrc)}&limit=12`
        );
        const json = await res.json();
        if (json.success) {
          setHeadlessConnected(Boolean(json.session?.isConnected));
          setHeadlessInstance(json.session?.instanceName || "nanda-principal");
          if (Array.isArray(json.groups) && json.groups.length > 0) {
            setHeadlessGroups(json.groups);
            // Define grupo de destino padrão (PROMO MODA & BELEZA #4 ou PROMO TESTE)
            const defaultTarget =
              json.groups.find((g: HeadlessGroup) =>
                g.name.toUpperCase().includes("PROMO MODA & BELEZA #4")
              ) ||
              json.groups.find((g: HeadlessGroup) => g.isRecommendedTarget) ||
              json.groups[0];
            if (defaultTarget && !selectedTargetJid) {
              setSelectedTargetJid(defaultTarget.jid);
            }
          }
          setCapturedOffers(json.offers || []);
          const initialEdits: Record<string, string> = {};
          for (const off of json.offers || []) {
            initialEdits[off.messageId] = off.clonedText;
          }
          setEditedTexts(initialEdits);
        }
      } catch (err) {
        console.error("Erro ao carregar feed Headless:", err);
      } finally {
        setLoadingHeadless(false);
      }
    },
    [selectedSourceJid, selectedTargetJid]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRules, resGroups] = await Promise.all([
        fetch("/api/mirror/rules").then((r) => r.json()),
        fetch("/api/groups")
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
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
    loadHeadlessFeed("120363425588077327@g.us");
  }, []);

  const handleSourceGroupChange = (newJid: string) => {
    setSelectedSourceJid(newJid);
    const found = headlessGroups.find((g) => g.jid === newJid);
    if (found) {
      setSourceGroupName(found.name);
      setSourceGroupId(found.jid);
    }
    loadHeadlessFeed(newJid);
  };

  const handleSendSingleOffer = async (offer: CapturedOffer) => {
    if (!selectedTargetJid) {
      showToast("⚠️ Selecione um grupo de destino primeiro!");
      return;
    }

    const srcGroup = headlessGroups.find((g) => g.jid === selectedSourceJid);
    const tgtGroup = headlessGroups.find((g) => g.jid === selectedTargetJid);
    const finalClonedText = editedTexts[offer.messageId] || offer.clonedText;

    setSendingMsgId(offer.messageId);
    try {
      const res = await fetch("/api/mirror/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_OFFER",
          sourceJid: selectedSourceJid,
          sourceGroupName: srcGroup?.name || "Grupo Monitorado",
          targetJid: selectedTargetJid,
          targetGroupName: tgtGroup?.name || "Grupo Destino",
          messageId: offer.messageId,
          clonedText: finalClonedText,
          hasImage: offer.hasImage,
          sendWithImage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          `✅ Oferta enviada para "${
            tgtGroup?.name || "Grupo Destino"
          }" com seu link de afiliada!`
        );
      } else {
        showToast(`❌ Erro ao enviar: ${json.error || "Falha no disparo"}`);
      }
    } catch (err: any) {
      showToast(`❌ Falha ao enviar oferta: ${err.message}`);
    } finally {
      setSendingMsgId(null);
    }
  };

  const handleSendBatchOffers = async () => {
    if (!selectedTargetJid || capturedOffers.length === 0) {
      showToast("⚠️ Nenhuma oferta disponível para envio em lote.");
      return;
    }

    const tgtGroup = headlessGroups.find((g) => g.jid === selectedTargetJid);
    const topOffers = capturedOffers.slice(0, 3).map((o) => ({
      messageId: o.messageId,
      clonedText: editedTexts[o.messageId] || o.clonedText,
      hasImage: o.hasImage,
    }));

    setSendingBatch(true);
    try {
      const res = await fetch("/api/mirror/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_BATCH",
          targetJid: selectedTargetJid,
          targetGroupName: tgtGroup?.name || "Grupo Destino",
          sendWithImage,
          offers: topOffers,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          `🚀 ${json.sentCount} ofertas clonadas e enviadas para "${
            tgtGroup?.name || "Grupo Destino"
          }"!`
        );
      } else {
        showToast(`❌ Erro no envio em lote: ${json.error || "Tente novamente"}`);
      }
    } catch (err: any) {
      showToast(`❌ Erro ao enviar lote: ${err.message}`);
    } finally {
      setSendingBatch(false);
    }
  };

  const handleOpenQrModal = async () => {
    setQrModalOpen(true);
    setLoadingQr(true);
    setQrBase64(null);
    try {
      const res = await fetch("/api/mirror/headless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_QR" }),
      });
      const json = await res.json();
      if (json.base64) {
        setQrBase64(json.base64);
      } else if (json.status === "open") {
        setHeadlessConnected(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleCreateRuleFromHeadless = async () => {
    const srcGroup = headlessGroups.find((g) => g.jid === selectedSourceJid);
    const tgtGroup = headlessGroups.find((g) => g.jid === selectedTargetJid);

    if (!srcGroup || !tgtGroup) {
      showToast("Selecione o grupo de origem e o grupo de destino.");
      return;
    }

    setSavingRule(true);
    try {
      const res = await fetch("/api/mirror/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGroupName: srcGroup.name,
          sourceGroupId: srcGroup.jid,
          targetGroupId: tgtGroup.jid,
          targetGroupName: tgtGroup.name,
          style: "CLONE",
          mediaFormat: sendWithImage ? "IMAGE" : "PREVIEW",
          intervalMinutes: 0,
          filterOfficialOnly: true,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          `✅ Espelhamento salvo: "${srcGroup.name}" ➡️ "${tgtGroup.name}"!`
        );
        loadData();
      } else {
        showToast("❌ Erro ao salvar regra: " + json.error);
      }
    } catch {
      showToast("❌ Erro ao salvar regra de espelhamento.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceGroupName.trim()) {
      showToast("Informe o nome do grupo a ser monitorado/clonado.");
      return;
    }

    const targetName =
      targetGroupName ||
      groups.find((g) => g.id === targetGroupId)?.name ||
      headlessGroups.find((g) => g.jid === targetGroupId)?.name ||
      "Meu Grupo VIP";

    setSavingRule(true);
    try {
      const res = await fetch("/api/mirror/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGroupName: sourceGroupName.trim(),
          sourceGroupId: sourceGroupId || null,
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
        setRules(
          rules.map((r) =>
            r.id === id ? { ...r, isActive: !currentStatus } : r
          )
        );
        showToast(
          `Regra ${!currentStatus ? "ativada" : "pausada"} com sucesso.`
        );
      }
    } catch {
      showToast("Falha ao atualizar regra.");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra de espelhamento?"))
      return;
    try {
      const res = await fetch(`/api/mirror/rules?id=${id}`, {
        method: "DELETE",
      });
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

  const currentSourceGroupObj = headlessGroups.find(
    (g) => g.jid === selectedSourceJid
  );
  const currentTargetGroupObj = headlessGroups.find(
    (g) => g.jid === selectedTargetJid
  );

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
            ((•)) Espelhamento em Navegador Oculto (WhatsApp Headless)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Conectado em segundo plano ao seu WhatsApp: escolha um grupo de origem para capturar ofertas reais, trocar apenas o link para o seu de afiliada e disparar para o seu grupo!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenQrModal}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
          >
            <QrCode className="w-3.5 h-3.5 text-orange-400" />
            Sessão Oculta ({headlessConnected ? "Conectado" : "Conectar QR"})
          </button>

          <button
            onClick={() => {
              setIsTestModalOpen(true);
              setTestResult(null);
            }}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            Testar Link / Texto Manual
          </button>
        </div>
      </div>

      {/* =====================================================================
          PAINEL CENTRAL: NAVEGADOR OCULTO (WHATSAPP HEADLESS)
      ====================================================================== */}
      <div className="bg-gradient-to-br from-[#13131a] via-[#121216] to-[#18121e] border border-orange-500/30 rounded-2xl p-6 mb-8 shadow-2xl">
        {/* Barra de Status do Navegador Oculto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Navegador Oculto Ativo (Headless WhatsApp Web)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE 24/7
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Instância: <b className="text-zinc-200">{headlessInstance}</b> •{" "}
                <b className="text-orange-400">{headlessGroups.length} grupos</b>{" "}
                encontrados no WhatsApp • Desencurtador automático{" "}
                <code className="text-emerald-400">meli.la / shope.ee / amzn.to</code>{" "}
                ativo!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle Enviar com Imagem Original */}
            <button
              type="button"
              onClick={() => setSendWithImage(!sendWithImage)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                sendWithImage
                  ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {sendWithImage
                ? "Clonar Foto Original: SIM"
                : "Apenas Texto + Preview"}
            </button>

            <button
              type="button"
              onClick={() => loadHeadlessFeed(selectedSourceJid)}
              disabled={loadingHeadless}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingHeadless ? "animate-spin text-orange-400" : ""}`}
              />
              Recarregar Ofertas do Grupo
            </button>
          </div>
        </div>

        {/* Seletores Reais: GRUPO DE ORIGEM -> GRUPO DE DESTINO */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-5 mb-6">
          {/* Grupo de Origem */}
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">
              📢 1. Selecione o Grupo de Origem (De onde pegar as ofertas)
            </label>
            <select
              value={selectedSourceJid}
              onChange={(e) => handleSourceGroupChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3.5 py-3 text-xs font-medium text-white focus:outline-none"
            >
              <optgroup label="🔥 Grupos de Ofertas Detectados no seu WhatsApp">
                {headlessGroups
                  .filter((g) => g.isRecommendedSource)
                  .map((g) => (
                    <option key={g.jid} value={g.jid}>
                      🔥 {g.name} ({g.size} membros)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="📱 Todos os Outros Grupos do WhatsApp">
                {headlessGroups
                  .filter((g) => !g.isRecommendedSource)
                  .map((g) => (
                    <option key={g.jid} value={g.jid}>
                      {g.name} ({g.size} membros)
                    </option>
                  ))}
              </optgroup>
            </select>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">
              O navegador oculto lê as mensagens postadas neste grupo e desencurta os links automaticamente.
            </span>
          </div>

          {/* Seta */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-orange-300 font-bold mt-1">
              TROCA LINK
            </span>
          </div>

          {/* Grupo de Destino */}
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
              🎯 2. Selecione o Seu Grupo de Destino (Para onde enviar)
            </label>
            <select
              value={selectedTargetJid}
              onChange={(e) => setSelectedTargetJid(e.target.value)}
              className="w-full bg-zinc-900 border border-emerald-600/50 focus:border-emerald-400 rounded-xl px-3.5 py-3 text-xs font-medium text-white focus:outline-none"
            >
              <optgroup label="🎯 Seus Grupos VIP Recomendados">
                {headlessGroups
                  .filter((g) => g.isRecommendedTarget)
                  .map((g) => (
                    <option key={g.jid} value={g.jid}>
                      ✅ {g.name} ({g.size} membros)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="📱 Outros Grupos">
                {headlessGroups
                  .filter((g) => !g.isRecommendedTarget)
                  .map((g) => (
                    <option key={g.jid} value={g.jid}>
                      {g.name} ({g.size} membros)
                    </option>
                  ))}
              </optgroup>
            </select>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">
              A mensagem original + foto será enviada para este grupo com a sua tag de afiliada!
            </span>
          </div>
        </div>

        {/* Barra de Ações Rápidas do Par Selecionado */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-xs text-zinc-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Espelhando de{" "}
              <b className="text-orange-400">
                {currentSourceGroupObj?.name || "Grupo de Origem"}
              </b>{" "}
              para{" "}
              <b className="text-emerald-400">
                {currentTargetGroupObj?.name || "Seu Grupo VIP"}
              </b>{" "}
              (Tag ML: <code className="text-amber-300">clma9212398</code>)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateRuleFromHeadless}
              disabled={savingRule}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              Salvar Regra Automática Deste Grupo
            </button>

            <button
              type="button"
              onClick={handleSendBatchOffers}
              disabled={sendingBatch || capturedOffers.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              {sendingBatch ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Clonar e Enviar Top 3 Agora
            </button>
          </div>
        </div>

        {/* Lista de Ofertas Reais Capturadas do Grupo Selecionado */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Ofertas Capturadas do Grupo ({capturedOffers.length} prontas com seu link de afiliada)
            </h3>
          </div>

          {loadingHeadless ? (
            <div className="py-12 text-center text-zinc-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-7 h-7 animate-spin text-orange-500" />
              <p className="text-xs">
                Lendo mensagens do grupo no navegador oculto, desencurtando links{" "}
                <code>meli.la</code> e aplicando sua tag de afiliada...
              </p>
            </div>
          ) : capturedOffers.length === 0 ? (
            <div className="py-10 text-center bg-zinc-950/50 rounded-xl border border-zinc-800/80 p-6">
              <p className="text-sm font-semibold text-zinc-300">
                Nenhuma oferta com link encontrada nas últimas mensagens deste grupo.
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Experimente selecionar os grupos 🔥 <b>Promo de Rica 🛍️ #35</b>,{" "}
                <b>OFERTAS IMPERDÍVEIS #87</b> ou <b>AchaDIN MODA & BELEZA 03</b> no seletor acima!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {capturedOffers.map((offer) => {
                const currentText =
                  editedTexts[offer.messageId] ?? offer.clonedText;
                const isSendingThis = sendingMsgId === offer.messageId;

                return (
                  <div
                    key={offer.messageId}
                    className="bg-zinc-950/90 border border-zinc-800/90 hover:border-orange-500/40 rounded-xl p-4 flex flex-col justify-between transition-all shadow-lg"
                  >
                    <div>
                      {/* Cabeçalho do Card */}
                      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-zinc-800/80">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                            ✅ LINK TROCADO P/ SEU AFILIADO
                          </span>
                          {offer.hasImage && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-[10px]">
                              📸 Com Foto Original
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(offer.timestamp * 1000).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>

                      {/* Texto já com o Link de Afiliado da Nanda (Editável se quiser) */}
                      <label className="block text-[10px] text-zinc-400 mb-1 font-medium">
                        Mensagem pronta (você pode editar antes de enviar):
                      </label>
                      <textarea
                        rows={6}
                        value={currentText}
                        onChange={(e) =>
                          setEditedTexts((prev) => ({
                            ...prev,
                            [offer.messageId]: e.target.value,
                          }))
                        }
                        className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-orange-500 rounded-lg p-2.5 text-xs text-zinc-100 font-sans leading-relaxed focus:outline-none resize-none"
                      />

                      {/* Resumo dos links substituídos */}
                      {offer.replacedLinks && offer.replacedLinks.length > 0 && (
                        <div className="mt-2 bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-2 space-y-1">
                          {offer.replacedLinks.map((lnk, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between text-zinc-400">
                                <span className="truncate max-w-[180px]">
                                  De: <s>{lnk.originalUrl}</s>
                                </span>
                                <span className="text-orange-400 font-bold">
                                  {lnk.store}
                                </span>
                              </div>
                              <a
                                href={lnk.affiliateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline truncate flex items-center gap-1 font-medium"
                              >
                                <Link2 className="w-3 h-3 shrink-0" />
                                {lnk.affiliateUrl}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentText);
                          showToast("📋 Oferta com seu link copiada!");
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                        title="Copiar mensagem"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendSingleOffer(offer)}
                        disabled={isSendingThis}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                      >
                        {isSendingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Enviar p/ Grupo Destino
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Regras Ativas Cadastradas */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Regras Automáticas de Espelhamento Salvas
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
          <div className="text-center py-8 text-zinc-500">
            <Radio className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-zinc-400">
              Nenhuma regra automática salva
            </p>
            <p className="text-xs mt-1">
              Clique em &ldquo;Salvar Regra Automática Deste Grupo&rdquo; acima para deixar o espelhamento salvo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.isActive)}
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      rule.isActive
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : "bg-zinc-600"
                    }`}
                    title={
                      rule.isActive
                        ? "Regra Ativa (clique para pausar)"
                        : "Pausada"
                    }
                  />

                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="text-zinc-300">
                      📢 {rule.sourceGroupName}
                    </span>
                    <ArrowRight className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-emerald-400">
                      🎯 {rule.targetGroupName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 font-semibold text-[10px]">
                      {rule.style === "CLONE"
                        ? "📎 CLONE DE LINKS"
                        : "T TEMPLATE"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px]">
                      {rule.mediaFormat === "IMAGE"
                        ? "🖼️ Imagem Original"
                        : "👁️ Preview"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
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

      {/* MODAL DE QR CODE DO NAVEGADOR OCULTO */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-orange-400" />
              Sessão do WhatsApp em Navegador Oculto
            </h3>

            {loadingQr ? (
              <div className="py-10 flex flex-col items-center gap-3 text-zinc-400">
                <RefreshCw className="w-7 h-7 animate-spin text-orange-500" />
                <span className="text-xs">
                  Verificando sessão do navegador oculto...
                </span>
              </div>
            ) : qrBase64 ? (
              <div className="space-y-3 my-4">
                <p className="text-xs text-zinc-300">
                  Escaneie o QR Code abaixo com o WhatsApp que participa dos grupos que você deseja espelhar:
                </p>
                <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                  <img
                    src={qrBase64}
                    alt="QR Code WhatsApp Headless"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-emerald-400">
                  WhatsApp Já Conectado no Navegador Oculto!
                </p>
                <p className="text-xs text-zinc-400">
                  A instância <b>{headlessInstance}</b> está ativa, com sincronização silenciosa (sem notificações repetitivas no celular) e monitorando{" "}
                  <b>{headlessGroups.length} grupos</b>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SIMULAÇÃO / TESTE DE CLONAGEM MANUAL */}
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
              Simulador de Desencurtamento e Troca de Link
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Cole abaixo qualquer oferta com link encurtado (<code>meli.la</code>,{" "}
              <code>shope.ee</code>, <code>s.shopee.com.br</code>,{" "}
              <code>amzn.to</code>) para desencurtar e converter para o seu link de afiliada:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Mensagem Original do Grupo Concorrente:
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
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Desencurtar e Converter para Meu Link de Afiliada
              </button>

              {testResult && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      {testResult.replacedLinksCount} link(s) convertido(s) com sucesso!
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
                      Mensagem Pronta para Envio:
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
