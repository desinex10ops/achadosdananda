"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Ticket,
  Flame,
  CheckCircle2,
  Send,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Search,
  Layers,
  Zap,
  Copy,
  Check,
  Trash2,
  MousePointerClick,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface RobotAgent {
  id: string;
  name: string;
  nicheSlug: string;
  categoryName: string;
  emoji: string;
  description: string;
  status: string;
}

interface MeliCoupon {
  id: string;
  code: string;
  discountLabel: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscountAmount: number | null;
  minSpend: number;
  nicheSlug: string;
  categoryName: string;
  onlyFull?: boolean;
  validUntil: string;
  source: "ON_PAGE_CHECKBOX" | "DATABASE";
}

interface MatchedDeal {
  id: string;
  itemId: string;
  title: string;
  imageUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  originalPrice: number;
  dealPrice: number;
  dealDiscountPct: number;
  isFull: boolean;
  salesCountText: string;
  nicheSlug: string;
  categoryName: string;
  robotId: string;
  robotName: string;
  isLiveFromMeli?: boolean;
  onPageCouponText?: string | null;
  applicableCoupons: Array<{
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
    isCheckboxCoupon?: boolean;
  }>;
  bestCoupon: {
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
    isCheckboxCoupon?: boolean;
  } | null;
}

export default function ExercitoRobosPage() {
  const [robots, setRobots] = useState<RobotAgent[]>([]);
  const [coupons, setCoupons] = useState<MeliCoupon[]>([]);
  const [deals, setDeals] = useState<MatchedDeal[]>([]);
  const [nicheSummary, setNicheSummary] = useState<
    Record<string, { count: number; withCouponCount: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [scanningUrls, setScanningUrls] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);

  // Filtros de visualização e Busca Ao Vivo por Produto Específico / Público Feminino
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>("ALL");
  const [onlyWithCoupon, setOnlyWithCoupon] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [liveProductQuery, setLiveProductQuery] = useState<string>("");
  const [activeSearchedTerm, setActiveSearchedTerm] = useState<string>("");
  const [onlyFemaleProducts, setOnlyFemaleProducts] = useState<boolean>(false);

  const [selectedCouponByDeal, setSelectedCouponByDeal] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal de alimentar links ao vivo para os robôs
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [rawLinksInput, setRawLinksInput] = useState("");

  // Modal de cadastrar novo cupom real para cruzamento
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [newCouponMinSpend, setNewCouponMinSpend] = useState("79");
  const [newCouponCategory, setNewCouponCategory] = useState("Todos os Nichos");

  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadArmyData = async (
    forceRefresh = false,
    customSearchTerm = "",
    femaleOnly = false
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (forceRefresh) params.set("refresh", "true");
      if (customSearchTerm.trim()) params.set("q", customSearchTerm.trim());
      if (femaleOnly) params.set("onlyFemale", "true");

      const qs = params.toString();
      const res = await fetch(`/api/robots/meli-army${qs ? `?${qs}` : ""}`);
      const json = await res.json();
      if (json.success) {
        setRobots(json.robots || []);
        setCoupons(json.coupons || []);
        setDeals(json.deals || []);
        setNicheSummary(json.nicheSummary || {});
      }
    } catch (err) {
      console.error("Erro ao carregar Exército de Robôs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteLiveProductSearch = async (
    termToSearch: string,
    femaleOnly: boolean
  ) => {
    setLiveProductQuery(termToSearch);
    setActiveSearchedTerm(termToSearch.trim());
    setOnlyFemaleProducts(femaleOnly);
    setSelectedNiche("all");
    setSearchQuery("");
    await loadArmyData(true, termToSearch, femaleOnly);
    if (termToSearch.trim() && femaleOnly) {
      setFeedbackBanner(
        `👩🔍 Robôs buscaram "${termToSearch}" filtrando apenas produtos femininos (${affiliateTagLabel})!`
      );
    } else if (termToSearch.trim()) {
      setFeedbackBanner(
        `🔍 Robôs buscaram ofertas reais para "${termToSearch}" no Mercado Livre!`
      );
    } else if (femaleOnly) {
      setFeedbackBanner(
        `👩 Modo "Só Produtos Femininos" ativado! Exibindo Perfumaria, Beleza, Moda, Bolsas e Calçados Femininos.`
      );
    } else {
      setFeedbackBanner(`🔥 Exibindo todas as Ofertas do Dia do Mercado Livre.`);
    }
  };

  const affiliateTagLabel = "clma9212398";

  useEffect(() => {
    loadArmyData(false, "", false);
  }, []);

  const handleScanCustomLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawLinksInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    try {
      setScanningUrls(true);
      const res = await fetch("/api/robots/meli-army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SCAN_URLS",
          urls: lines,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDeals(json.deals || []);
        setCoupons(json.coupons || []);
        setNicheSummary(json.nicheSummary || {});
        setScanModalOpen(false);
        setRawLinksInput("");
        setFeedbackBanner(
          `✅ Varredura ao vivo concluída! Os robôs classificaram os links por nicho e cruzaram com os cupons reais.`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanningUrls(false);
    }
  };

  const handleCreateSmartCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) return;

    try {
      const res = await fetch("/api/robots/meli-army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_COUPON",
          code: newCouponCode.trim().toUpperCase(),
          discount: newCouponDiscount.trim(),
          minSpend: newCouponMinSpend,
          category: newCouponCategory,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCoupons(json.coupons || []);
        setDeals(json.deals || []);
        setNicheSummary(json.nicheSummary || {});
        setSelectedCouponCode(newCouponCode.trim().toUpperCase());
        setCouponModalOpen(false);
        setNewCouponCode("");
        setNewCouponDiscount("");
        setFeedbackBanner(
          `🎟️ Cupom ${newCouponCode.toUpperCase()} salvo e cruzado com as ofertas do dia!`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (coupon: MeliCoupon, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/robots/meli-army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_COUPON",
          couponId: coupon.id,
          code: coupon.code,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCoupons(json.coupons || []);
        setDeals(json.deals || []);
        setNicheSummary(json.nicheSummary || {});
        if (selectedCouponCode === coupon.code) {
          setSelectedCouponCode("ALL");
        }
        setFeedbackBanner(`🗑️ Cupom ${coupon.code} removido por estar esgotado.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getActiveCouponForDeal = (deal: MatchedDeal) => {
    if (selectedCouponCode !== "ALL") {
      const found = deal.applicableCoupons.find((c) => c.code === selectedCouponCode);
      if (found) return found;
    }
    const manualCode = selectedCouponByDeal[deal.id];
    if (manualCode && manualCode !== "NONE") {
      const found = deal.applicableCoupons.find((c) => c.code === manualCode);
      if (found) return found;
    }
    return null;
  };

  const handleDispatchSingle = async (deal: MatchedDeal) => {
    try {
      setDispatching(deal.id);
      const activeCoupon = getActiveCouponForDeal(deal);

      const res = await fetch("/api/robots/meli-army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_DEALS",
          items: [
            {
              title: deal.title,
              imageUrl: deal.imageUrl,
              originalUrl: deal.originalUrl,
              affiliateUrl: deal.affiliateUrl,
              originalPrice: deal.originalPrice,
              dealPrice: deal.dealPrice,
              finalPrice: activeCoupon ? activeCoupon.finalPrice : deal.dealPrice,
              couponCode: activeCoupon ? activeCoupon.code : null,
              couponDiscountLabel: activeCoupon ? activeCoupon.discountLabel : null,
              isCheckboxCoupon: activeCoupon?.isCheckboxCoupon || false,
              categoryName: deal.categoryName,
              nicheSlug: deal.nicheSlug,
              isFull: deal.isFull,
            },
          ],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackBanner(
          `🚀 "${deal.title.slice(0, 42)}..." enviado para a Vitrine e Fila do nicho ${deal.categoryName}!`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(null);
    }
  };

  const handleDispatchFilteredBatch = async () => {
    if (filteredDeals.length === 0) return;
    try {
      setDispatching("BATCH");
      const payloadItems = filteredDeals.slice(0, 10).map((deal) => {
        const activeCoupon = getActiveCouponForDeal(deal);
        return {
          title: deal.title,
          imageUrl: deal.imageUrl,
          originalUrl: deal.originalUrl,
          affiliateUrl: deal.affiliateUrl,
          originalPrice: deal.originalPrice,
          dealPrice: deal.dealPrice,
          finalPrice: activeCoupon ? activeCoupon.finalPrice : deal.dealPrice,
          couponCode: activeCoupon ? activeCoupon.code : null,
          couponDiscountLabel: activeCoupon ? activeCoupon.discountLabel : null,
          isCheckboxCoupon: activeCoupon?.isCheckboxCoupon || false,
          categoryName: deal.categoryName,
          nicheSlug: deal.nicheSlug,
          isFull: deal.isFull,
        };
      });

      const res = await fetch("/api/robots/meli-army", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_DEALS",
          items: payloadItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackBanner(json.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredDeals = deals.filter((deal) => {
    if (selectedNiche !== "all" && deal.nicheSlug !== selectedNiche) {
      return false;
    }
    if (selectedCouponCode !== "ALL") {
      const applies = deal.applicableCoupons.some((c) => c.code === selectedCouponCode);
      if (!applies) return false;
    }
    if (onlyWithCoupon && deal.applicableCoupons.length === 0) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !deal.title.toLowerCase().includes(q) &&
        !deal.categoryName.toLowerCase().includes(q) &&
        !deal.itemId.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const getCouponMatchCount = (code: string) => {
    return deals.filter(
      (d) =>
        (selectedNiche === "all" || d.nicheSlug === selectedNiche) &&
        d.applicableCoupons.some((c) => c.code === code)
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/90 text-white p-6 rounded-2xl border border-amber-500/30 shadow-lg">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Bot className="w-4 h-4" />
            <span>VARREDURA 100% AO VIVO • MERCADO LIVRE (TAG: clma9212398)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <span>Exército de Robôs ML</span>
            <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full">
              {deals.length} Ofertas Reais Hoje
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Os robôs entram ao vivo em <b>mercadolivre.com.br/ofertas</b>, separam os produtos por nicho e detectam automaticamente quais anúncios possuem <b>Cupom Oficial Ativo na Página</b> (&quot;OFF com Cupom&quot;)!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCouponModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition active:scale-95"
          >
            <Ticket className="w-4 h-4" />
            <span>+ Cadastrar Código de Cupom ML</span>
          </button>

          <button
            onClick={() => setScanModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-rose-400" />
            <span>Alimentar Links ML</span>
          </button>

          <button
            onClick={() => loadArmyData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>Varrer ML Agora</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-200 px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs text-emerald-400 hover:underline shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SEÇÃO 1: Os 5 Robôs Separados por Nicho */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-600" />
            <span>1. Selecione o Robô de Nicho</span>
          </h2>
          {selectedNiche !== "all" && (
            <button
              onClick={() => setSelectedNiche("all")}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Mostrar Todos os Nichos ({deals.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => setSelectedNiche("all")}
            className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              selectedNiche === "all"
                ? "bg-slate-900 text-white border-rose-500 shadow-lg ring-2 ring-rose-500/20"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🤖</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                AO VIVO
              </span>
            </div>
            <div>
              <h3 className="text-xs font-extrabold">Todos os Robôs</h3>
              <p
                className={`text-[11px] mt-0.5 ${
                  selectedNiche === "all" ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {deals.length} ofertas • {deals.filter((d) => d.bestCoupon).length} c/ cupom real
              </p>
            </div>
          </button>

          {robots.map((robot) => {
            const isSelected = selectedNiche === robot.nicheSlug;
            const stats = nicheSummary[robot.nicheSlug] || { count: 0, withCouponCount: 0 };

            return (
              <button
                key={robot.id}
                type="button"
                onClick={() => setSelectedNiche(isSelected ? "all" : robot.nicheSlug)}
                className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-900 text-white border-amber-400 shadow-lg ring-2 ring-amber-400/25"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{robot.emoji}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                  <h3 className="text-xs font-extrabold leading-snug">{robot.categoryName}</h3>
                  <p
                    className={`text-[10px] mt-1 line-clamp-2 ${
                      isSelected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {robot.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[11px] font-bold">
                  <span>{stats.count} itens</span>
                  <span className="text-amber-500">🎟️ {stats.withCouponCount} c/ cupom</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: Robô Caçador de Cupons Reais ML */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-amber-500" />
              <span>2. Cupons Reais Detectados Agora no Mercado Livre</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Os cupons marcados com <b>&quot;Ativar no Anúncio&quot;</b> são oficiais da página do produto no ML (não exigem digitar código: basta marcar a caixinha azul &quot;Aplicar cupom&quot; no anúncio!).
            </p>
          </div>

          {selectedCouponCode !== "ALL" && (
            <button
              onClick={() => setSelectedCouponCode("ALL")}
              className="text-xs font-bold text-rose-600 hover:underline self-start sm:self-auto"
            >
              Limpar filtro de cupom ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCouponCode("ALL")}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all ${
              selectedCouponCode === "ALL"
                ? "bg-slate-900 text-white border-slate-900 shadow"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Todos ({coupons.length})
          </button>

          {coupons.map((c) => {
            const matchCount = getCouponMatchCount(c.code);
            const active = selectedCouponCode === c.code;
            const isNativeCheckbox = c.source === "ON_PAGE_CHECKBOX";

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCouponCode(active ? "ALL" : c.code)}
                className={`cursor-pointer px-3.5 py-2 rounded-xl border transition-all shrink-0 flex items-center gap-3 ${
                  active
                    ? "bg-amber-400/15 border-amber-500 text-slate-900 ring-2 ring-amber-400/30"
                    : "bg-slate-50 border-slate-200 hover:border-amber-400 text-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    {isNativeCheckbox ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded bg-sky-600 text-white">
                        <MousePointerClick className="w-3 h-3" />
                        <span>CUPOM NO ANÚNCIO: R$ {c.discountValue} OFF</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                        {c.code}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {matchCount} {matchCount === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">
                    {isNativeCheckbox
                      ? 'Basta clicar em "Aplicar cupom" dentro do anúncio ML'
                      : `${c.discountLabel} • Mín: R$ ${c.minSpend} (${c.categoryName})`}
                  </p>
                </div>

                {!isNativeCheckbox && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCode(c.code);
                      }}
                      title="Copiar código"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                    >
                      {copiedCode === c.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCoupon(c, e)}
                      title="Marcar cupom como esgotado / remover"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: Caçador de Produto Específico (Ex: Perfume Boticário) & Modo Só Produtos Femininos */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-rose-600" />
              <span>Caçador de Produto Específico &amp; Universo Feminino</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Busque qualquer produto ou marca específica no Mercado Livre (ex: <b>Perfume Boticário</b>, <b>Bolsa Feminina</b>, <b>Vestido</b>) ou ative o modo exclusivo <b>Só Produtos Femininos</b>.
            </p>
          </div>

          {/* Botão Destaque: Só Produtos Femininos */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleExecuteLiveProductSearch(liveProductQuery, !onlyFemaleProducts)
              }
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition shadow-sm ${
                onlyFemaleProducts
                  ? "bg-pink-600 text-white ring-2 ring-pink-300"
                  : "bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200"
              }`}
            >
              <span>👩 {onlyFemaleProducts ? "Modo Só Produtos Femininos: ATIVO" : "Ver Só Produtos Femininos"}</span>
            </button>

            {(activeSearchedTerm || onlyFemaleProducts) && (
              <button
                type="button"
                onClick={() => handleExecuteLiveProductSearch("", false)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                <span>🔥 Voltar p/ Ofertas Gerais do Dia</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Busca Direta no Mercado Livre */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteLiveProductSearch(liveProductQuery, onlyFemaleProducts);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={liveProductQuery}
              onChange={(e) => setLiveProductQuery(e.target.value)}
              placeholder="Digite um produto específico (Ex: perfume boticário, floratta, vestido feminino, bolsa, maquiagem)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-sm transition active:scale-95 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? "Garimpando no ML..." : "Buscar Produto no ML"}</span>
          </button>
        </form>

        {/* Atalhos Rápidos de 1 Clique (Marcas & Categorias Femininas) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
            Atalhos Rápidos:
          </span>
          {[
            { label: "👩 Só Produtos Femininos (Todos)", query: "", female: true },
            { label: "🌸 Perfume O Boticário", query: "perfume boticario", female: true },
            { label: "💜 Eudora & Natura", query: "eudora natura perfume", female: true },
            { label: "👗 Vestidos & Moda Feminina", query: "vestido moda feminina", female: true },
            { label: "👜 Bolsas Femininas", query: "bolsa feminina", female: true },
            { label: "👠 Sandálias & Calçados", query: "sandalia feminina", female: true },
            { label: "💄 Maquiagem & Skincare", query: "maquiagem skincare", female: true },
            { label: "💇‍♀️ Cabelos (Secador / Escova)", query: "secador escova cabelo", female: true },
          ].map((preset) => {
            const isSelected =
              activeSearchedTerm === preset.query &&
              onlyFemaleProducts === preset.female &&
              (preset.query !== "" || onlyFemaleProducts);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleExecuteLiveProductSearch(preset.query, preset.female)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition ${
                  isSelected
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-rose-50/60 hover:bg-rose-100/80 text-slate-800 border-rose-200/80"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Sub-barra: Filtro rápido nos resultados + Enfileirar Lote */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Refinar dentro dos resultados exibidos..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={onlyWithCoupon}
                onChange={(e) => setOnlyWithCoupon(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>🎟️ Só com Cupom Disponível ({deals.filter((d) => d.bestCoupon).length})</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleDispatchFilteredBatch}
            disabled={filteredDeals.length === 0 || dispatching !== null}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>
              {dispatching === "BATCH"
                ? "Enfileirando por Nicho..."
                : `Enfileirar Lote (${Math.min(filteredDeals.length, 10)} itens)`}
            </span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 4: Grade de Ofertas Reais Garimpadas + Matemática do Cupom */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-white border border-slate-200 p-4 animate-pulse"
            />
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Bot className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhum item encontrado para este filtro
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Desmarque o filtro acima ou clique em &quot;Mostrar Todos os Nichos&quot; para ver todas as ofertas ao vivo do Mercado Livre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => {
            const activeCoupon = getActiveCouponForDeal(deal);

            return (
              <div
                key={deal.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Topo do Card: Robô do Nicho + Selo FULL */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 text-white">
                      <span>{deal.robotName}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {deal.isFull && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ⚡ FULL
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-500">
                        {deal.salesCountText}
                      </span>
                    </div>
                  </div>

                  {/* Foto + Título */}
                  <div className="flex gap-3.5 items-start mb-3">
                    <div className="w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={deal.imageUrl}
                        alt={deal.title}
                        className="w-full h-full object-contain p-1"
                      />
                      <span className="absolute top-1 left-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                        -{activeCoupon ? activeCoupon.totalDiscountPct : deal.dealDiscountPct}%
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        {deal.categoryName} • {deal.itemId}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug mt-0.5">
                        {deal.title}
                      </h3>
                      <a
                        href={deal.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-semibold mt-1"
                      >
                        <span>Abrir Anúncio Oficial (clma9212398)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Caixa de Cupom Real no Anúncio ou Código (Opcional para não distorcer o preço real do anúncio) */}
                  <div
                    className={`rounded-xl p-3 mb-3 space-y-1.5 border ${
                      activeCoupon
                        ? "bg-emerald-50/90 border-emerald-300"
                        : deal.bestCoupon
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-extrabold flex items-center gap-1.5 ${
                          activeCoupon
                            ? "text-emerald-900"
                            : deal.bestCoupon
                            ? "text-amber-900"
                            : "text-slate-600"
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {activeCoupon
                            ? `✅ Cupom Aplicado: ${activeCoupon.discountLabel}`
                            : deal.bestCoupon
                            ? `🎟️ Cupom Opcional Disponível (${deal.bestCoupon.discountLabel})`
                            : `✅ Preço Real da Oferta no ML (${deal.dealDiscountPct}% OFF)`}
                        </span>
                      </span>
                    </div>

                    {deal.applicableCoupons.length > 0 && (
                      <select
                        value={
                          selectedCouponCode !== "ALL"
                            ? selectedCouponCode
                            : selectedCouponByDeal[deal.id] || "NONE"
                        }
                        onChange={(e) =>
                          setSelectedCouponByDeal((prev) => ({
                            ...prev,
                            [deal.id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="NONE">
                          Manter Preço Real do Anúncio (R$ {deal.dealPrice.toFixed(2).replace(".", ",")})
                        </option>
                        {deal.applicableCoupons.map((c) => (
                          <option key={c.code} value={c.code}>
                            Simular c/ Cupom: {c.discountLabel} → R${" "}
                            {c.finalPrice.toFixed(2).replace(".", ",")}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Matemática do Preço Final + Botão de Enfileirar no Nicho */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 line-through">
                        De: {formatCurrency(deal.originalPrice)}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        No anúncio: <span className="font-bold">{formatCurrency(deal.dealPrice)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                        {activeCoupon ? "Preço Final c/ Cupom" : "Preço Oferta"}
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {formatCurrency(activeCoupon ? activeCoupon.finalPrice : deal.dealPrice)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDispatchSingle(deal)}
                    disabled={dispatching !== null}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {dispatching === deal.id
                        ? "Enviando..."
                        : `Enfileirar em ${deal.categoryName}`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Alimentar Links do Mercado Livre para os Robôs */}
      <Modal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="🤖 Alimentar Links do Mercado Livre para os Robôs"
      >
        <form onSubmit={handleScanCustomLinks} className="space-y-4">
          <p className="text-xs text-slate-600">
            Cole 1 ou vários links de produtos do Mercado Livre (um por linha). O Exército de Robôs vai extrair a foto oficial, separar cada item no seu <b>Nicho correto</b> e aplicar sua tag <b>clma9212398</b>!
          </p>
          <textarea
            rows={5}
            value={rawLinksInput}
            onChange={(e) => setRawLinksInput(e.target.value)}
            placeholder="https://produto.mercadolivre.com.br/MLB-...\nhttps://mercadolivre.com/sec/..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setScanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={scanningUrls}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold"
            >
              {scanningUrls ? "Robôs Varrendo Links..." : "Classificar & Cruzar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Adicionar Código de Cupom Oficial do Dia */}
      <Modal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="🎟️ Cadastrar Código de Cupom Oficial do Dia (ML)"
      >
        <form onSubmit={handleCreateSmartCoupon} className="space-y-4">
          <p className="text-xs text-slate-600">
            Quando o Mercado Livre liberar um código digitável oficial no dia, cadastre aqui para o robô cruzar com os produtos elegíveis. Assim que o orçamento do ML esgotar, basta clicar no ícone de lixeira ao lado do cupom para removê-lo!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Oficial do Cupom *
              </label>
              <input
                type="text"
                required
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="Código liberado hoje pelo ML"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Desconto (% ou R$) *
              </label>
              <input
                type="text"
                required
                value={newCouponDiscount}
                onChange={(e) => setNewCouponDiscount(e.target.value)}
                placeholder="Ex: R$ 20 OFF ou 10% OFF"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Compra Mínima (R$)
              </label>
              <input
                type="number"
                value={newCouponMinSpend}
                onChange={(e) => setNewCouponMinSpend(e.target.value)}
                placeholder="79"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nicho Elegível
              </label>
              <select
                value={newCouponCategory}
                onChange={(e) => setNewCouponCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="Todos os Nichos">Todos os Nichos</option>
                <option value="Casa & Cozinha">🏠 Casa & Cozinha</option>
                <option value="Moda & Vestuário">👗 Moda & Vestuário</option>
                <option value="Beleza & Saúde">💄 Beleza & Saúde</option>
                <option value="Eletrônicos & Tech">📱 Eletrônicos & Tech</option>
                <option value="Ferramentas">🛠️ Ferramentas</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCouponModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold"
            >
              Salvar & Ver Itens Elegíveis
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
