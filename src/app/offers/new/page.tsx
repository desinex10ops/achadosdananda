"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Flame,
  Sparkles,
  Link2,
  DollarSign,
  Package,
  Layers,
  Send,
  Clock,
  ListOrdered,
  Radar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { calculateDiscount, formatCurrency, formatPercentage } from "@/lib/utils";
import { generateOfferMessage } from "@/modules/templates/engine";
import { MessagePreview } from "@/components/ui/MessagePreview";

interface Marketplace {
  id: string;
  name: string;
  slug: string;
}

interface Template {
  id: string;
  name: string;
  emoji: string;
  structure: string;
  cta: string;
  footer: string | null;
  showOriginalPrice: boolean;
  showDiscount: boolean;
  showCoupon: boolean;
  showShipping: boolean;
  isDefault: boolean;
}

interface Group {
  id: string;
  name: string;
  category: { name: string };
  maxOffersPerHour: number;
  maxDailyOffers: number;
}

export default function NewOfferPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      }
    >
      <NewOfferContent />
    </React.Suspense>
  );
}

function NewOfferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data sources
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [marketplaceId, setMarketplaceId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [category, setCategory] = useState("Tecnologia");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [originalPrice, setOriginalPrice] = useState<string>("199.90");
  const [currentPrice, setCurrentPrice] = useState<string>("99.90");
  const [couponCode, setCouponCode] = useState("");
  const [shippingInfo, setShippingInfo] = useState("Frete Grátis");
  const [originalUrl, setOriginalUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80");
  const [callout, setCallout] = useState("Menor preço histórico!");
  const [notes, setNotes] = useState("");

  // Template & Groups selection
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");

  // Live generated message text
  const [generatedMessage, setGeneratedMessage] = useState("");

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [mRes, tRes, gRes] = await Promise.all([
          fetch("/api/marketplaces"),
          fetch("/api/templates"),
          fetch("/api/groups"),
        ]);

        const mData = await mRes.json();
        const tData = await tRes.json();
        const gData = await gRes.json();

        if (mData.success && mData.data.length > 0) {
          setMarketplaces(mData.data);
          setMarketplaceId(mData.data[0].id);
        }

        if (tData.success && tData.data.length > 0) {
          setTemplates(tData.data);
          const defaultT = tData.data.find((t: Template) => t.isDefault) || tData.data[0];
          setSelectedTemplateId(defaultT.id);
        }

        if (gData.success && gData.data.groups.length > 0) {
          setGroups(gData.data.groups);
          // Auto-select first group
          setSelectedGroupIds([gData.data.groups[0].id]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do formulário:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate discounts dynamically
  const orig = parseFloat(originalPrice) || 0;
  const curr = parseFloat(currentPrice) || 0;
  const { discountPercentage, savedAmount } = calculateDiscount(orig, curr);

  // Auto-generate text whenever parameters or template change
  useEffect(() => {
    if (!selectedTemplateId || templates.length === 0) return;

    const currentTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!currentTemplate) return;

    const msg = generateOfferMessage(
      {
        title: productName || "Nome do Produto em Oferta",
        callout,
        originalPrice: orig,
        currentPrice: curr,
        discountPercentage,
        savedAmount,
        couponCode: couponCode || null,
        shippingInfo,
        affiliateUrl: affiliateUrl || "https://link-afiliado-aqui.com",
        originalUrl,
      },
      currentTemplate
    );

    setGeneratedMessage(msg);
  }, [
    productName,
    callout,
    orig,
    curr,
    discountPercentage,
    savedAmount,
    couponCode,
    shippingInfo,
    affiliateUrl,
    selectedTemplateId,
    templates,
  ]);

  const toggleGroup = (id: string) => {
    if (selectedGroupIds.includes(id)) {
      setSelectedGroupIds(selectedGroupIds.filter((gid) => gid !== id));
    } else {
      setSelectedGroupIds([...selectedGroupIds, id]);
    }
  };

  const handleAction = async (action: "QUEUE" | "SCHEDULE" | "PUBLISH_NOW" | "RADAR") => {
    if (!productName.trim()) {
      setFeedback({ type: "error", message: "Informe o nome do produto." });
      return;
    }
    if (curr <= 0) {
      setFeedback({ type: "error", message: "Informe um preço atual válido." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplaceId,
          productName,
          productDescription,
          category,
          subcategory,
          brand,
          imageUrl,
          originalPrice: orig,
          currentPrice: curr,
          couponCode,
          shippingInfo,
          originalUrl,
          affiliateUrl,
          callout,
          notes,
          action,
          scheduledFor: action === "SCHEDULE" ? scheduledFor : null,
          templateId: selectedTemplateId,
          groupIds: selectedGroupIds,
          customGeneratedText: generatedMessage,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setFeedback({ type: "error", message: json.error || "Erro ao processar oferta." });
        setSubmitting(false);
        return;
      }

      // If warnings exist (e.g. anti-repeat or frequency limit)
      if (json.data.warnings && json.data.warnings.length > 0) {
        alert("Atenção às regras:\n" + json.data.warnings.join("\n"));
      }

      setFeedback({
        type: "success",
        message:
          action === "PUBLISH_NOW"
            ? "Oferta publicada com sucesso!"
            : action === "SCHEDULE"
            ? "Oferta agendada com sucesso!"
            : action === "RADAR"
            ? "Oferta salva no Radar para análise!"
            : "Oferta colocada na fila de publicações!",
      });

      setTimeout(() => {
        if (action === "QUEUE" || action === "SCHEDULE" || action === "PUBLISH_NOW") {
          router.push("/queue");
        } else if (action === "RADAR") {
          router.push("/radar");
        } else {
          router.push("/offers");
        }
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro de conexão." });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Preparando tela de cadastro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cadastrar Nova Oferta
          </h1>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            Fluxo Rápido
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Preencha as informações do produto, selecione o template e defina a distribuição em poucos cliques.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : feedback.type === "warning"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2-Column Layout: Left Form / Right WhatsApp Preview & Action */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Form: 7 columns */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Marketplace Selection */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
              1. Marketplace de Origem
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {marketplaces.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMarketplaceId(m.id)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 text-xs font-semibold border transition-all ${
                    marketplaceId === m.id
                      ? "border-rose-500 bg-rose-50/70 text-rose-700 shadow-sm ring-2 ring-rose-500/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold text-sm">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Produto Info */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              2. Dados do Produto
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Fone de Ouvido Bluetooth Sem Fio TWS..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Casa & Cozinha">Casa & Cozinha</option>
                  <option value="Moda & Beleza">Moda & Beleza</option>
                  <option value="Games & Geek">Games & Geek</option>
                  <option value="Ferramentas">Ferramentas</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subcategoria
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Ex: Áudio / Celular"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Xiaomi, Samsung"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chamada Promocional / Destaque
              </label>
              <input
                type="text"
                value={callout}
                onChange={(e) => setCallout(e.target.value)}
                placeholder="Ex: Menor preço dos últimos 6 meses!"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {/* 3. Preços e Economia Automática */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Preços & Cálculo Automático
              </label>
              {discountPercentage > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {formatPercentage(discountPercentage)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    Economia de {formatCurrency(savedAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço Original (De) R$
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="199.90"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço Atual (Por) R$ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="99.90"
                  className="w-full rounded-xl border border-rose-300 bg-rose-50/20 px-3.5 py-2.5 text-sm font-bold text-rose-600 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cupom de Desconto (opcional)
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ex: QUERO10"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Informação de Frete
                </label>
                <input
                  type="text"
                  value={shippingInfo}
                  onChange={(e) => setShippingInfo(e.target.value)}
                  placeholder="Ex: Frete Grátis com cupom"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          </div>

          {/* 4. Links & Imagem */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              4. Links & Imagem do Produto
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link de Afiliado * (Link encurtado / oficial de comissão)
              </label>
              <input
                type="url"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://shope.ee/exemplo ou https://amzn.to/..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link Original do Marketplace
              </label>
              <input
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="https://mercadolivre.com.br/..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                URL da Imagem do Produto *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {/* 5. Grupos de Destino */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                5. Selecione os Grupos de Destino
              </label>
              <span className="text-xs font-medium text-rose-600">
                {selectedGroupIds.length} selecionado(s)
              </span>
            </div>

            <div className="space-y-2">
              {groups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-white ${
                          isSelected ? "bg-rose-600 border-rose-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">{group.name}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{group.category?.name}</span>
                          <span>•</span>
                          <span>Limite: {group.maxDailyOffers} ofertas/dia</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Template Picker, Live WhatsApp Preview & Action Buttons: 5 columns */}
        <div className="space-y-6 lg:col-span-5 sticky top-20">
          {/* Template Selector */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Escolha o Template
            </label>

            <div className="grid grid-cols-2 gap-2">
              {templates.map((tpl) => (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border text-left transition-all ${
                    selectedTemplateId === tpl.id
                      ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-500"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{tpl.emoji}</span>
                  <span className="truncate">{tpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live WhatsApp Preview */}
          <MessagePreview
            message={generatedMessage}
            onTextChange={(newText) => setGeneratedMessage(newText)}
            editable={true}
          />

          {/* Agendamento Horário (se quiser agendar) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Horário para Agendamento (Opcional)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Action Buttons Bar (Section 30) */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("QUEUE")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-500 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              <ListOrdered className="h-4 w-4" />
              <span>{submitting ? "Processando..." : "Adicionar à Fila"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("PUBLISH_NOW")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Publicar Agora</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("SCHEDULE")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-600 bg-sky-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 transition-all"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Agendar Horário</span>
              </button>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("RADAR")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-all"
            >
              <Radar className="h-3.5 w-3.5 text-amber-500" />
              <span>Salvar no Radar de Ofertas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
