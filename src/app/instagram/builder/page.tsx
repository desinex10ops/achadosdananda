"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Save,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  MessageCircle,
  Heart,
  Plus,
  X,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

function InstagramBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const autoTest = searchParams.get("test") === "true";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form states
  const [name, setName] = useState("Disparo Automático 'EU QUERO'");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [triggerType, setTriggerType] = useState("COMMENT_ANY");
  const [targetMediaId, setTargetMediaId] = useState("");
  const [matchType, setMatchType] = useState("CONTAINS");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([
    "EU QUERO",
    "QUERO",
    "LINK",
    "PREÇO",
    "QUAL O VALOR",
  ]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [ignoreAccents, setIgnoreAccents] = useState(true);

  // Ações
  const [likeComment, setLikeComment] = useState(true);
  const [replyInPublic, setReplyInPublic] = useState(true);
  const [publicReplyTemplate, setPublicReplyTemplate] = useState(
    "Oi @{username}! Enviamos o link detalhado no seu Direct 💖 Dá uma olhadinha!"
  );
  const [sendDirectMessage, setSendDirectMessage] = useState(true);
  const [dmMessageTemplate, setDmMessageTemplate] = useState(
    "Olá @{username}! Tudo bem?\n\nIdentificamos que você pediu o link da oferta:\n🔗 {link}\n\nAproveite antes que o estoque acabe ou o valor aumente!"
  );
  const [dmButtonText, setDmButtonText] = useState("Ver Oferta");
  const [customLink, setCustomLink] = useState("https://achadosdananda.com.br/r/promocao");

  // Anti-ban & Horários
  const [delaySeconds, setDelaySeconds] = useState(15);
  const [jitterSeconds, setJitterSeconds] = useState(10);
  const [maxExecutionsPerUser, setMaxExecutionsPerUser] = useState(1);
  const [workingHoursOnly, setWorkingHoursOnly] = useState(false);
  const [tagsToAdd, setTagsToAdd] = useState("interessado,oferta_comentada");

  // Test Runner Simulation
  const [simulatedComment, setSimulatedComment] = useState("eu quero o link da garrafa térmica por favor");
  const [simulatedUsername, setSimulatedUsername] = useState("mariasilva_achados");
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Carrega contas conectadas
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/automations/instagram/accounts");
        const data = await res.json();
        if (data.accounts?.length > 0) {
          setAccounts(data.accounts);
          setAccountId(data.accounts[0].id);
        }

        // Se estiver em modo edição, carrega a automação
        if (editId) {
          setLoading(true);
          const autoRes = await fetch(`/api/automations/instagram/${editId}`);
          const autoData = await autoRes.json();
          if (autoData.success && autoData.automation) {
            const a = autoData.automation;
            setName(a.name);
            setAccountId(a.accountId);
            setTriggerType(a.triggerType);
            setTargetMediaId(a.targetMediaId || "");
            setMatchType(a.matchType);
            setKeywords(
              a.keywords
                .split(",")
                .map((k: string) => k.trim())
                .filter(Boolean)
            );
            setCaseSensitive(a.caseSensitive);
            setIgnoreAccents(a.ignoreAccents);
            setLikeComment(a.likeComment);
            setReplyInPublic(a.replyInPublic);
            setPublicReplyTemplate(a.publicReplyTemplate || "");
            setSendDirectMessage(a.sendDirectMessage);
            setDmMessageTemplate(a.dmMessageTemplate || "");
            setDmButtonText(a.dmButtonText || "");
            setCustomLink(a.customLink || "");
            setDelaySeconds(a.delaySeconds);
            setJitterSeconds(a.jitterSeconds);
            setMaxExecutionsPerUser(a.maxExecutionsPerUser);
            setWorkingHoursOnly(a.workingHoursOnly);
            setTagsToAdd(a.tagsToAdd || "");
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [editId]);

  // Se autoTest foi passado pela URL, roda o teste após carregar
  useEffect(() => {
    if (autoTest && editId && !loading) {
      handleRunSimulation();
    }
  }, [autoTest, editId, loading]);

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const newKw = keywordInput.trim();
    if (!keywords.includes(newKw)) {
      setKeywords([...keywords, newKw]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== kwToRemove));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Por favor, informe o nome da automação.");
      return;
    }
    if (keywords.length === 0) {
      alert("Adicione pelo menos uma palavra-chave para o gatilho.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        accountId,
        triggerType,
        targetMediaId: targetMediaId.trim() || null,
        matchType,
        keywords: keywords.join(", "),
        caseSensitive,
        ignoreAccents,
        likeComment,
        replyInPublic,
        publicReplyTemplate,
        sendDirectMessage,
        dmMessageTemplate,
        dmButtonText,
        customLink,
        delaySeconds,
        jitterSeconds,
        maxExecutionsPerUser,
        workingHoursOnly,
        tagsToAdd,
      };

      const url = editId ? `/api/automations/instagram/${editId}` : "/api/automations/instagram";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/instagram");
      } else {
        alert(data.error || "Erro ao salvar automação.");
      }
    } catch (err: any) {
      alert("Erro ao conectar com o servidor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunSimulation = async () => {
    setTesting(true);
    setSimulationResult(null);

    // Se temos um ID existente no banco, usa a rota do backend
    if (editId) {
      try {
        const res = await fetch(`/api/automations/instagram/${editId}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            simulatedText: simulatedComment,
            simulatedUsername,
            simulatedMediaId: targetMediaId || "post_demonstracao_123",
          }),
        });
        const data = await res.json();
        setSimulationResult(data);
      } catch (err: any) {
        setSimulationResult({
          success: false,
          steps: [{ step: "Falha de Rede", status: "FAILED", details: err.message }],
        });
      } finally {
        setTesting(false);
      }
      return;
    }

    // Se ainda está em criação (não salva), executa simulação local no cliente
    setTimeout(() => {
      const normalizedInput = ignoreAccents
        ? simulatedComment.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        : simulatedComment.toLowerCase();

      const matchedKw = keywords.find((k) => {
        const normK = ignoreAccents
          ? k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
          : k.toLowerCase();
        return matchType === "EXACT" ? normalizedInput === normK : normalizedInput.includes(normK);
      });

      const isMatch = Boolean(matchedKw);

      const previewReply = replyInPublic
        ? publicReplyTemplate.replace(/@?\{\{?username\}?\}/gi, `@${simulatedUsername}`)
        : undefined;

      const previewDm = sendDirectMessage
        ? dmMessageTemplate
            .replace(/@?\{\{?username\}?\}/gi, `@${simulatedUsername}`)
            .replace(/\{\{?link\}?\}/gi, customLink)
        : undefined;

      setSimulationResult({
        success: isMatch,
        steps: [
          {
            step: "1. Recepção do Comentário",
            status: "SUCCESS",
            details: `Comentário recebido de @${simulatedUsername}: "${simulatedComment}"`,
          },
          {
            step: "2. Avaliação de Palavras-Chave",
            status: isMatch ? "SUCCESS" : "FAILED",
            details: isMatch
              ? `Palavra correspondente encontrada: [${matchedKw}] no modo ${matchType}.`
              : `Nenhuma das palavras configuradas (${keywords.join(", ")}) foi encontrada no comentário.`,
          },
          {
            step: "3. Limites Anti-Ban & Temporização",
            status: "SUCCESS",
            details: `Atraso humanizado de ${delaySeconds}s + variação jitter de até ${jitterSeconds}s calculado.`,
          },
          {
            step: "4. Ações Pré-configuradas",
            status: isMatch ? "SUCCESS" : "SKIPPED",
            details: isMatch
              ? `${likeComment ? "[Curtir] " : ""}${replyInPublic ? "[Resposta Pública] " : ""}${
                  sendDirectMessage ? "[Enviar DM] " : ""
                }`
              : "Ações canceladas por ausência de correspondência de regra.",
          },
        ],
        preview: {
          publicReply: previewReply,
          dmMessage: previewDm,
          button: dmButtonText ? { text: dmButtonText, url: customLink } : undefined,
          tagsAssigned: tagsToAdd ? tagsToAdd.split(",") : [],
        },
      });
      setTesting(false);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/instagram"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              <span>{editId ? "Editar Automação" : "Criar Nova Regra de Automação"}</span>
            </h1>
            <p className="text-xs text-slate-500">
              Gatilhos 100% determinísticos por palavras-chave com proteção anti-ban e templates configurados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunSimulation}
            disabled={testing}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{testing ? "Simulando..." : "Testar no Simulador"}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-500 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Salvando..." : "Salvar Automação"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Builder (Left) & Simulator Preview (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulário Builder */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bloco 1: Informações Básicas & Conta */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">
                1
              </span>
              <h2 className="font-bold text-slate-900 text-sm">Informações & Conta</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Automação *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Ex: Disparo 'EU QUERO' Promoção Shopee"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conta do Instagram
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                  {accounts.length === 0 && <option value="">@achadosdananda (Padrão)</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Bloco 2: Gatilho e Palavras-Chave */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white text-xs font-bold">
                2
              </span>
              <h2 className="font-bold text-slate-900 text-sm">Gatilho & Palavras-Chave</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Gatilho
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none bg-white"
                >
                  <option value="COMMENT_ANY">Qualquer Post / Reel</option>
                  <option value="COMMENT_POST">Post Específico (informar ID)</option>
                  <option value="DIRECT_MESSAGE">Mensagem Direta (DM)</option>
                  <option value="STORY_REPLY">Resposta de Story</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Correspondência
                </label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none bg-white"
                >
                  <option value="CONTAINS">Contém a Palavra (Recomendado)</option>
                  <option value="EXACT">Correspondência Exata</option>
                  <option value="STARTS_WITH">Começa com</option>
                  <option value="ANY">Qualquer Comentário (Sem filtro de texto)</option>
                </select>
              </div>
            </div>

            {triggerType === "COMMENT_POST" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID do Post ou Reel (Meta Media ID)
                </label>
                <input
                  type="text"
                  value={targetMediaId}
                  onChange={(e) => setTargetMediaId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                  placeholder="Ex: 17982348729384728"
                />
              </div>
            )}

            {/* Input de Palavras-chave com Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Palavras-Chave Gatilho (Pressione Enter para adicionar)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                  placeholder="Ex: EU QUERO, QUERO, LINK..."
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Tags Lista */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-rose-400 hover:text-rose-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Opções de normalização */}
            <div className="flex items-center gap-6 pt-1 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreAccents}
                  onChange={(e) => setIgnoreAccents(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Ignorar Acentuação (Ex: &quot;preço&quot; = &quot;preco&quot;)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Diferenciar Maiúsculas/Minúsculas</span>
              </label>
            </div>
          </div>

          {/* Bloco 3: Ações e Respostas Configuradas */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600 text-white text-xs font-bold">
                3
              </span>
              <h2 className="font-bold text-slate-900 text-sm">Ações Automáticas</h2>
            </div>

            {/* Ação: Curtir Comentário */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Curtir o Comentário</h4>
                  <p className="text-[11px] text-slate-400">
                    Curte automaticamente o comentário do seguidor para aumentar o engajamento
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={likeComment}
                onChange={(e) => setLikeComment(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
            </div>

            {/* Ação: Resposta Pública */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">Resposta Pública ao Comentário</h4>
                    <p className="text-[11px] text-slate-400">
                      Responde no próprio post avisando que enviou o link no Direct
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={replyInPublic}
                  onChange={(e) => setReplyInPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
              </div>

              {replyInPublic && (
                <div className="pt-2">
                  <textarea
                    rows={2}
                    value={publicReplyTemplate}
                    onChange={(e) => setPublicReplyTemplate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                    placeholder="Use {username} para marcar o usuário..."
                  />
                  <span className="text-[10px] text-slate-400">Variáveis disponíveis: &#123;username&#125;</span>
                </div>
              )}
            </div>

            {/* Ação: Enviar Direct Message (DM) */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">Enviar Mensagem no Direct (DM)</h4>
                    <p className="text-[11px] text-slate-400">
                      Envia o link do produto de forma privada para o seguidor
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendDirectMessage}
                  onChange={(e) => setSendDirectMessage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
              </div>

              {sendDirectMessage && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Template da Mensagem no Direct
                    </label>
                    <textarea
                      rows={4}
                      value={dmMessageTemplate}
                      onChange={(e) => setDmMessageTemplate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                      placeholder="Olá @{username}..."
                    />
                    <span className="text-[10px] text-slate-400">
                      Variáveis: &#123;username&#125;, &#123;link&#125;, &#123;produto&#125;, &#123;preco&#125;
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Texto do Botão
                      </label>
                      <input
                        type="text"
                        value={dmButtonText}
                        onChange={(e) => setDmButtonText(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                        placeholder="Ex: Ver Oferta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Link de Destino / Afiliado
                      </label>
                      <input
                        type="text"
                        value={customLink}
                        onChange={(e) => setCustomLink(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                        placeholder="https://achadosdananda.com.br/r/..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bloco 4: Temporização & Anti-Ban */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white text-xs font-bold">
                4
              </span>
              <h2 className="font-bold text-slate-900 text-sm">Anti-Ban, Horários & Tags</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atraso Base (Segundos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jitter Aleatório (+ 0 a X s)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={jitterSeconds}
                  onChange={(e) => setJitterSeconds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Máx. por Seguidor
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxExecutionsPerUser}
                  onChange={(e) => setMaxExecutionsPerUser(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags para Atribuir ao Seguidor
                </label>
                <input
                  type="text"
                  value={tagsToAdd}
                  onChange={(e) => setTagsToAdd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
                  placeholder="interessado, shopee, oferta_comentada"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={workingHoursOnly}
                    onChange={(e) => setWorkingHoursOnly(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Disparar apenas em horário comercial (08h às 22h)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Simulador em Tempo Real & Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Painel do Simulador */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Play className="h-4 w-4 text-rose-500" />
                <span>Simulador de Teste (Test Runner)</span>
              </h2>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Sem envio real
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comentário Simulado do Seguidor
                </label>
                <input
                  type="text"
                  value={simulatedComment}
                  onChange={(e) => setSimulatedComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Usuário Simulado (@)
                </label>
                <input
                  type="text"
                  value={simulatedUsername}
                  onChange={(e) => setSimulatedUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{testing ? "Avaliando Regra..." : "Executar Simulação de Disparo"}</span>
              </button>
            </div>

            {/* Diagnóstico da Simulação */}
            {simulationResult && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Resultado do Diagnóstico</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      simulationResult.success
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {simulationResult.success ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Aprovado</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        <span>Rejeitado</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  {simulationResult.steps?.map((st: any, idx: number) => {
                    const isSuccess = st.status === "SUCCESS";
                    const isWarn = st.status === "WARNING";
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-2.5 text-xs ${
                          isSuccess
                            ? "border-emerald-100 bg-emerald-50/40 text-emerald-950"
                            : isWarn
                            ? "border-amber-100 bg-amber-50/40 text-amber-950"
                            : "border-rose-100 bg-rose-50/40 text-rose-950"
                        }`}
                      >
                        <div className="font-semibold">{st.step}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{st.details}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Previews de Resposta */}
                {simulationResult.success && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Preview do que o seguidor receberá:
                    </span>

                    {/* Preview de Resposta Pública */}
                    {simulationResult.preview?.publicReply && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          Resposta no Comentário Público:
                        </span>
                        <p className="font-medium text-slate-800">
                          {simulationResult.preview.publicReply}
                        </p>
                      </div>
                    )}

                    {/* Preview do Direct Message (DM) */}
                    {simulationResult.preview?.dmMessage && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-xs space-y-2.5">
                        <div className="flex items-center gap-1.5 text-purple-700 font-semibold text-[11px]">
                          <Send className="h-3.5 w-3.5" />
                          <span>Mensagem no Direct (DM):</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-line text-xs font-normal">
                          {simulationResult.preview.dmMessage}
                        </p>
                        {simulationResult.preview.button && (
                          <div className="pt-1">
                            <span className="inline-block rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                              {simulationResult.preview.button.text} ↗
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstagramBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-xs text-slate-500">
          Carregando Construtor de Automação...
        </div>
      }
    >
      <InstagramBuilderContent />
    </Suspense>
  );
}

