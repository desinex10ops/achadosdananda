"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Percent,
  CheckSquare,
  Square,
  Copy,
  Check,
  Save,
  Settings,
  Sparkles,
  ExternalLink,
  Layers,
  ShoppingBag,
  Store,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Zap,
  Tag,
  Clock,
  Send,
  Wand2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

interface ShopeeProduct {
  id: string;
  itemId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  imageUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  salesCount: number;
  rating: number;
  commissionRate: number;
  shopName: string;
  isTopSeller: boolean;
  hasExtraCommission: boolean;
  category: string;
}

interface MeliProduct {
  id: string;
  itemId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  imageUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  salesCountText: string;
  isFull: boolean;
  category: string;
  marketplace: "MERCADO_LIVRE";
}

export default function BuscarProdutosPage() {
  // Estado de Navegação / Marketplace
  const [activePlatform, setActivePlatform] = useState<"shopee" | "meli" | "amazon" | "magalu">("shopee");
  const [activeSubTab, setActiveSubTab] = useState<string>("captura");

  // Filtros de Busca Shopee
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [sort, setSort] = useState("DISCOUNT_DESC");
  const [productType, setProductType] = useState("TODOS");
  const [limit, setLimit] = useState(100);
  const [topSellersOnly, setTopSellersOnly] = useState(false);
  const [extraCommissionOnly, setExtraCommissionOnly] = useState(false);

  // Produtos Shopee & Seleção
  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState<string>("PREVIEW_CATALOG");
  const [totalFound, setTotalFound] = useState(0);

  // Mercado Livre: Captura por Links
  const [meliLinksInput, setMeliLinksInput] = useState("");
  const [meliProducts, setMeliProducts] = useState<MeliProduct[]>([]);
  const [selectedMeliIds, setSelectedMeliIds] = useState<Set<string>>(new Set());
  const [loadingMeli, setLoadingMeli] = useState(false);
  const [meliBatchProgress, setMeliBatchProgress] = useState<string | null>(null);

  // Modal de Personalização do Disparo (Imagem 4)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchInterval, setDispatchInterval] = useState(10);
  const [dispatchTemplate, setDispatchTemplate] = useState("Template 1");
  const [dispatchMediaFormat, setDispatchMediaFormat] = useState<"IMAGE" | "PREVIEW">("PREVIEW");
  const [badgeDiscount, setBadgeDiscount] = useState(true);
  const [badgeFreeShipping, setBadgeFreeShipping] = useState(true);
  const [applyCouponToPrice, setApplyCouponToPrice] = useState(false);
  const [showWithCoupon, setShowWithCoupon] = useState(true);
  const [secondaryTitle, setSecondaryTitle] = useState("high ticket");
  const [aiCtaGenerated, setAiCtaGenerated] = useState(false);

  // Ações & Notificações
  const [savingBulk, setSavingBulk] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Configuração da API Shopee
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    appId: "",
    appSecret: "",
    affiliateTag: "",
    isConfigured: false,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Exibir Toast temporário
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar configurações da API da Shopee
  const loadApiConfig = async () => {
    try {
      const res = await fetch("/api/marketplaces/shopee/config");
      const json = await res.json();
      if (json.success && json.data) {
        setApiConfig({
          appId: json.data.appId || "",
          appSecret: "",
          affiliateTag: json.data.affiliateTag || "",
          isConfigured: json.data.isConfigured || false,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar config da Shopee:", err);
    }
  };

  // Buscar Produtos Shopee
  const handleSearch = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.append("keyword", keyword.trim());
      if (category && category !== "Todas as categorias") params.append("category", category);
      params.append("sort", sort);
      params.append("limit", String(limit));
      if (topSellersOnly) params.append("topSellers", "true");
      if (extraCommissionOnly) params.append("extraCommission", "true");

      const res = await fetch(`/api/marketplaces/shopee/search?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProducts(json.data || []);
        setTotalFound(json.total || json.data?.length || 0);
        setSourceType(json.source || "PREVIEW_CATALOG");
      } else {
        showToast("Erro ao buscar produtos: " + (json.error || "Tente novamente"));
      }
    } catch (err) {
      console.error(err);
      showToast("Falha de conexão ao buscar produtos.");
    } finally {
      setLoading(false);
    }
  };

  // Resolver Links do Mercado Livre
  const handleSearchMeliLinks = async () => {
    if (!meliLinksInput.trim()) {
      showToast("Cole os links do Mercado Livre no campo de texto.");
      return;
    }

    setLoadingMeli(true);
    const rawInput = meliLinksInput.trim();

    // 1. Detecta se é payload com dados e fotos reais da extensão (JSON)
    if (rawInput.startsWith("[") || rawInput.startsWith("{")) {
      try {
        let parsed = JSON.parse(rawInput);
        if (!Array.isArray(parsed) && parsed.items && Array.isArray(parsed.items)) {
          parsed = parsed.items;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((p: any, idx: number) => ({
            id: `ml-item-${idx}-${Date.now()}`,
            itemId: p.id || `mlb-${idx}`,
            title: p.title || "Oferta Mercado Livre",
            originalPrice: Number(p.originalPrice) || Number(p.currentPrice) || 99.90,
            currentPrice: Number(p.currentPrice) || 79.90,
            discountPercentage: Number(p.discountPercentage) || 25,
            imageUrl: p.imageUrl,
            originalUrl: p.originalUrl || p.url,
            affiliateUrl: p.affiliateUrl || p.url,
            salesCountText: p.salesCountText || `+${(idx + 1) * 2}k vendidos`,
            isFull: p.isFull !== undefined ? p.isFull : true,
            category: "Mercado Livre",
            marketplace: "MERCADO_LIVRE" as const,
          }));

          setMeliProducts(formatted);
          setSelectedMeliIds(new Set(formatted.map((p: any) => p.id)));
          showToast(`✅ ${formatted.length} produtos carregados com FOTOS REAIS!`);
          setLoadingMeli(false);
          return;
        }
      } catch (e) {}
    }

    // 2. Extrai links do texto ou linhas
    const urlRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?(?:mercadolivre\.com\.br|mercadolibre\.com|meli\.la)\/[^\s"'<>()[\]]+/gi;
    const matches = rawInput.match(urlRegex) || [];
    const targetLinks = matches.length > 0 ? Array.from(new Set(matches)) : rawInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    setMeliBatchProgress(`Carregando fotos e ofertas reais (${targetLinks.length} item(ns))...`);

    try {
      const res = await fetch("/api/marketplaces/mercadolivre/scrape-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: targetLinks, text: rawInput }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setMeliProducts(json.data);
        // Seleciona todos por padrão
        setSelectedMeliIds(new Set(json.data.map((p: any) => p.id)));
        showToast(`✅ ${json.data.length} produto(s) do Mercado Livre com fotos reais carregados!`);
      } else {
        showToast("❌ " + (json.error || "Nenhum produto pôde ser extraído dos links."));
      }
    } catch (err: any) {
      showToast("❌ Erro ao conectar com o serviço do Mercado Livre.");
    } finally {
      setLoadingMeli(false);
      setMeliBatchProgress(null);
    }
  };

  // Inicialização
  useEffect(() => {
    loadApiConfig();
    handleSearch();
  }, []);

  // Seleção de Produtos Shopee
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  // Seleção de Produtos Mercado Livre
  const toggleSelectMeli = (id: string) => {
    const next = new Set(selectedMeliIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMeliIds(next);
  };

  const toggleSelectAllMeli = () => {
    if (selectedMeliIds.size === meliProducts.length) setSelectedMeliIds(new Set());
    else setSelectedMeliIds(new Set(meliProducts.map((p) => p.id)));
  };

  // Limpar Tudo (Mercado Livre)
  const handleClearAllMeli = () => {
    setMeliProducts([]);
    setSelectedMeliIds(new Set());
    setMeliLinksInput("");
    showToast("🧹 Lista e links limpos com sucesso!");
  };

  // Salvar Produtos Selecionados em Lote (Shopee)
  const handleSaveSelected = async () => {
    if (selectedIds.size === 0) {
      showToast("Selecione pelo menos um produto para salvar.");
      return;
    }

    setSavingBulk(true);
    try {
      const selectedProducts = products.filter((p) => selectedIds.has(p.id));
      const res = await fetch("/api/marketplaces/shopee/save-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selectedProducts, sendToQueue: true }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(`🎉 ${json.message}`);
        setSelectedIds(new Set());
      } else {
        showToast(`❌ Erro: ${json.error || "Não foi possível salvar"}`);
      }
    } catch {
      showToast("❌ Falha ao salvar os produtos selecionados.");
    } finally {
      setSavingBulk(false);
    }
  };

  // Salvar Lote Mercado Livre com Personalização de Disparo
  const handleConfirmMeliDispatch = async () => {
    const selectedItems = meliProducts.filter((p) => selectedMeliIds.has(p.id));
    if (selectedItems.length === 0) {
      showToast("Nenhum produto selecionado para salvar.");
      return;
    }

    setSavingBulk(true);
    try {
      const res = await fetch("/api/marketplaces/shopee/save-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selectedItems.map((p) => ({
            ...p,
            salesCount: 500,
            rating: 4.8,
            commissionRate: 8.0,
            shopName: "Mercado Livre Oficial",
            isTopSeller: true,
            hasExtraCommission: false,
          })),
          sendToQueue: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(`🎉 ${selectedItems.length} produtos do Mercado Livre adicionados à Fila de Disparo!`);
        setIsDispatchModalOpen(false);
        setSelectedMeliIds(new Set());
      } else {
        showToast(`❌ Erro: ${json.error}`);
      }
    } catch {
      showToast("❌ Falha ao enviar para fila.");
    } finally {
      setSavingBulk(false);
    }
  };

  // Copiar Texto + Link de Afiliado Formatado
  const handleCopyProductText = (p: { title: string; originalPrice: number; currentPrice: number; discountPercentage: number; affiliateUrl?: string; originalUrl?: string }) => {
    const formatted = `🔥 *${p.title}*\n\nDe: ~R$ ${p.originalPrice.toFixed(2)}~\nPor apenas: *R$ ${p.currentPrice.toFixed(2)}* (${p.discountPercentage}% OFF!)\n\n👇 *Compre pelo link com desconto:*\n${p.affiliateUrl || p.originalUrl}`;
    navigator.clipboard.writeText(formatted);
    showToast("📋 Texto e Link copiados para a área de transferência!");
  };

  // Testar Conexão API Shopee
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/marketplaces/shopee/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_CONNECTION",
          appId: apiConfig.appId,
          appSecret: apiConfig.appSecret,
        }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ success: false, message: "Erro de conexão: " + err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  // Salvar Credenciais API Shopee
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/marketplaces/shopee/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: apiConfig.appId,
          appSecret: apiConfig.appSecret,
          affiliateTag: apiConfig.affiliateTag,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("✅ Credenciais da Shopee salvas com sucesso!");
        setIsConfigModalOpen(false);
        await loadApiConfig();
        handleSearch();
      } else {
        showToast("❌ Erro ao salvar: " + json.error);
      }
    } catch {
      showToast("❌ Falha ao salvar credenciais.");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white font-medium px-5 py-3 rounded-xl shadow-2xl shadow-orange-950/60 border border-orange-400/30 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar / Status Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-orange-500" />
            Buscar Produtos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Capture as melhores ofertas com altos descontos e comissões da Shopee e Mercado Livre para suas redes e grupos VIP.
          </p>
        </div>

        {/* Status de Conexão & Atalhos */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador de Status da API */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              apiConfig.isConfigured
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40"
                : "bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                apiConfig.isConfigured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {apiConfig.isConfigured ? "Shopee API Conectada" : "Configurar API Shopee"}
            <Settings className="w-3.5 h-3.5 ml-1 text-zinc-400" />
          </button>

          {/* Atalho para a Fila de Publicação */}
          <Link
            href="/queue"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            Ver Fila de Publicação
          </Link>
        </div>
      </div>

      {/* Seletor de Marketplace / Plataformas */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Shopee */}
        <button
          onClick={() => setActivePlatform("shopee")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePlatform === "shopee"
              ? "bg-[#ee4d2d] text-white shadow-lg shadow-orange-950/50 ring-2 ring-orange-400/30"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          Shopee
        </button>

        {/* Mercado Livre */}
        <button
          onClick={() => setActivePlatform("meli")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePlatform === "meli"
              ? "bg-[#ffe600] text-zinc-950 shadow-lg shadow-yellow-950/40 ring-2 ring-yellow-400/50"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Mercado Livre
        </button>

        {/* Amazon */}
        <button
          onClick={() => {
            setActivePlatform("amazon");
            showToast("Plataforma Amazon disponível em breve!");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePlatform === "amazon"
              ? "bg-sky-600 text-white"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          Amazon
        </button>

        {/* Magalu */}
        <button
          onClick={() => {
            setActivePlatform("magalu");
            showToast("Plataforma Magalu disponível em breve!");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activePlatform === "magalu"
              ? "bg-blue-600 text-white"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          Magalu
        </button>
      </div>

      {/* Sub-abas de Navegação */}
      <div className="flex items-center gap-6 border-b border-zinc-800/80 mb-6 text-xs font-semibold overflow-x-auto pb-1">
        {[
          { id: "captura", label: "Captura de Produtos" },
          { id: "categorias", label: "Explorar Categorias" },
          { id: "mais_buscados", label: "Mais Buscados" },
          { id: "lojas", label: "Lojas Favoritas" },
          { id: "csv", label: "Por Links / CSV" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`pb-2.5 transition-all whitespace-nowrap relative ${
              activeSubTab === tab.id
                ? activePlatform === "meli"
                  ? "text-yellow-400 font-bold"
                  : "text-orange-400 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {activeSubTab === tab.id && (
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${
                  activePlatform === "meli" ? "bg-yellow-400" : "bg-orange-500"
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* ABA MERCADO LIVRE: CAPTURA POR LINKS (IMAGEM 2 & 3)                      */}
      {/* ========================================================================= */}
      {activePlatform === "meli" ? (
        <div>
          {/* Caixa de Entrada de Links (Imagem 2) */}
          <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-yellow-950/60 border border-yellow-500/40 text-yellow-400">
                  🔗
                </span>
                Captura por Links — Mercado Livre
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400 text-zinc-950 uppercase tracking-wider">
                  PREMIUM
                </span>
              </h2>
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Cole os links do Mercado Livre (um por linha):
              </label>
              <div className="text-[11px] text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>📸 Dica de Ouro:</span>
                <span>Na aba do Mercado Livre, use o botão verde <b>"✨ Copiar com Fotos Reais"</b> ou <b>"🔗 Extrair Links"</b> do widget flutuante para carregar fotos 100% reais sem imagens trocadas!</span>
              </div>
            </div>
            <textarea
              rows={5}
              value={meliLinksInput}
              onChange={(e) => setMeliLinksInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "Enter") handleSearchMeliLinks();
              }}
              placeholder="https://www.mercadolivre.com.br/...\nhttps://produto.mercadolivre.com.br/MLB-..."
              className="w-full bg-zinc-900/90 border border-zinc-700/80 focus:border-yellow-400 rounded-xl p-3.5 text-xs text-zinc-200 font-mono placeholder-zinc-500 focus:outline-none transition-all mb-3 leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                <span>Dica: Use <b>Ctrl+Enter</b> para pesquisar ou clique no botão ao lado.</span>
              </div>

              <div className="flex items-center gap-2">
                {meliLinksInput && (
                  <button
                    onClick={() => setMeliLinksInput("")}
                    className="text-xs text-zinc-400 hover:text-red-400 px-3 py-2 rounded-xl border border-zinc-800 hover:border-red-900/40 bg-zinc-900/50 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar texto
                  </button>
                )}

                <button
                  onClick={handleSearchMeliLinks}
                  disabled={loadingMeli}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-950/40 disabled:opacity-50"
                >
                  {loadingMeli ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Pesquisar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progresso de Lote */}
            {meliBatchProgress && (
              <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-sky-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{meliBatchProgress}</span>
              </div>
            )}
          </div>

          {/* Barra de Ações Mercado Livre (Imagem 3) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 bg-zinc-900/70 border border-zinc-800 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {meliProducts.length} produto(s) encontrado(s).
              </span>

              {meliProducts.length > 0 && (
                <>
                  <button
                    onClick={toggleSelectAllMeli}
                    className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    {selectedMeliIds.size === meliProducts.length ? "Desmarcar tudo" : "Selecionar todos"}
                  </button>

                  <span className="text-zinc-700">|</span>

                  <button
                    onClick={handleClearAllMeli}
                    className="text-xs font-semibold text-rose-400/90 hover:text-rose-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar tudo
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDispatchModalOpen(true)}
                disabled={selectedMeliIds.size === 0}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                Salvar ({selectedMeliIds.size})
              </button>
            </div>
          </div>

          {/* Grid de Cards Mercado Livre (Imagem 3) */}
          {loadingMeli ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin text-yellow-400 mb-3" />
              <p className="text-sm">Extraindo produtos e preços do Mercado Livre...</p>
            </div>
          ) : meliProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#121215]/50 border border-dashed border-zinc-800 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-yellow-950/40 border border-yellow-500/20 flex items-center justify-center text-xl mb-3 text-yellow-400">
                🔗
              </div>
              <h3 className="text-sm font-bold text-zinc-200 mb-1">Nenhum produto na lista</h3>
              <p className="text-xs text-zinc-500 max-w-md">
                Extraia os links na aba de ofertas do Mercado Livre com a extensão ou cole os links no campo acima e clique em <b>Pesquisar</b>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {meliProducts.map((p) => {
                const isSelected = selectedMeliIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    className={`group relative bg-[#121215] border rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40"
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Badge de Desconto Verde (Topo Direito) */}
                    <div className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      {p.discountPercentage}% OFF
                    </div>

                    {/* Checkbox Individual (Topo Esquerdo) */}
                    <button
                      type="button"
                      onClick={() => toggleSelectMeli(p.id)}
                      className="absolute top-2 left-2 z-10 w-5 h-5 rounded bg-black/60 border border-zinc-600 hover:border-emerald-400 flex items-center justify-center transition-all"
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />}
                    </button>

                    {/* Imagem do Produto */}
                    <div
                      onClick={() => toggleSelectMeli(p.id)}
                      className="w-full aspect-square bg-zinc-950/90 overflow-hidden relative cursor-pointer"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Tag FULL */}
                    {p.isFull && (
                      <div className="px-3 pt-2">
                        <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 italic">
                          <Zap className="w-3 h-3 fill-emerald-400" /> FULL
                        </span>
                      </div>
                    )}

                    {/* Conteúdo do Card */}
                    <div className="p-3 pt-1 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        {/* Título */}
                        <h3
                          className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white"
                          title={p.title}
                        >
                          {p.title}
                        </h3>

                        {/* Preços */}
                        <div className="mt-2">
                          {p.originalPrice > p.currentPrice && (
                            <div className="text-[10px] text-zinc-500 line-through">
                              De: R$ {p.originalPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-sm font-extrabold text-white">
                            R$ {p.currentPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Vendas 🔥 e Tag ML 💎 */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/60 text-zinc-400">
                        <div className="flex items-center gap-1 text-orange-400 font-semibold">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                          <span>{p.salesCountText}</span>
                        </div>

                        <div className="flex items-center gap-1 text-sky-400 font-bold text-[10px]">
                          <span>💎 ML</span>
                        </div>
                      </div>

                      {/* Botão Selecionado / Toggle */}
                      <button
                        onClick={() => toggleSelectMeli(p.id)}
                        className={`w-full mt-1 text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-sky-600 text-white"
                            : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        {isSelected ? "Selecionado" : "Selecionar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* ABA SHOPEE: BUSCA EM TEMPO REAL & FILTROS (MÓDULO OFICIAL SHOPEE)         */
        /* ========================================================================= */
        <div>
          {/* Container Principal de Filtros & Busca Shopee */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 md:p-6 mb-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Captura de Produtos Shopee
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 border border-orange-500/30">
                  {sourceType === "API_LIVE" ? "API Oficial Shopee Ao Vivo" : "Modo Demonstração / Catálogo"}
                </span>
              </h2>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Configurar Chaves da API"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Linha 1: Input de Busca + Categoria + Botão Buscar */}
            <div className="flex flex-col md:flex-row items-stretch gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por palavra-chave... (ex: air fryer, vestido, ryzen, fone bluetooth, cera)"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-zinc-900/90 border border-zinc-700/70 focus:border-orange-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                />
              </div>

              <div className="w-full md:w-56">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/70 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none transition-all"
                >
                  <option value="Todas as categorias">Todas as categorias</option>
                  <option value="Eletrônicos">Eletrônicos & Informática</option>
                  <option value="Casa & Cozinha">Casa & Cozinha</option>
                  <option value="Moda & Acessórios">Moda & Acessórios</option>
                  <option value="Beleza & Cuidados">Beleza & Cuidados</option>
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#ee4d2d] hover:bg-[#d03b1d] text-white font-bold text-xs px-7 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>

            {/* Linha 2: Filtros Secundários & Checkboxes */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/60 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Ordenar */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">ORDENAR:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="DISCOUNT_DESC">Maiores Descontos</option>
                    <option value="SALES_DESC">Mais Vendidos</option>
                    <option value="PRICE_ASC">Menor Preço</option>
                    <option value="PRICE_DESC">Maior Preço</option>
                    <option value="COMMISSION_DESC">Maior Comissão</option>
                  </select>
                </div>

                {/* Tipo */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">TIPO:</span>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="NACIONAL">Nacional</option>
                    <option value="IMPORTADO">Importado</option>
                  </select>
                </div>

                {/* Qtd */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">QTD:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Checkboxes Top Vendedores & Comissão Extra */}
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={topSellersOnly}
                    onChange={(e) => setTopSellersOnly(e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500 rounded bg-zinc-900 border-zinc-700"
                  />
                  <span className="font-semibold text-[11px] uppercase tracking-wide">TOP VENDEDORES</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={extraCommissionOnly}
                    onChange={(e) => setExtraCommissionOnly(e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500 rounded bg-zinc-900 border-zinc-700"
                  />
                  <span className="font-semibold text-[11px] uppercase tracking-wide text-orange-400">COMISSÃO EXTRA</span>
                </label>
              </div>

              {/* Contador de Produtos */}
              <div className="text-zinc-400 text-xs font-medium">
                {totalFound} produtos encontrados
              </div>
            </div>
          </div>

          {/* Linha de Ação em Massa: Selecionar Todos + Salvar Selecionados */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 bg-zinc-900/60 border border-zinc-800/80 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white transition-colors"
              >
                {selectedIds.size === products.length && products.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500" />
                )}
                <span>
                  Selecionar Todos ({selectedIds.size}/{products.length})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSelected}
                disabled={savingBulk || selectedIds.size === 0}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-5 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingBulk ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Selecionados ({selectedIds.size})
              </button>
            </div>
          </div>

          {/* Grid de Cards Shopee */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <p className="text-sm">Buscando ofertas na Shopee...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 bg-zinc-950/40 rounded-2xl border border-zinc-800/60">
              <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-zinc-300">Nenhum produto encontrado</p>
              <p className="text-xs text-zinc-500 mt-1">Tente pesquisar por outros termos ou categorias.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {products.map((p) => {
                const isSelected = selectedIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    className={`group relative bg-[#121215] border rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? "border-orange-500/80 shadow-lg shadow-orange-950/30 ring-1 ring-orange-500/40"
                        : "border-zinc-800/90 hover:border-zinc-700"
                    }`}
                  >
                    {/* Badge de Desconto */}
                    {p.discountPercentage > 0 && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow">
                        -{p.discountPercentage}%
                      </div>
                    )}

                    {/* Checkbox Individual */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className="absolute top-2 left-2 z-10 w-5 h-5 rounded bg-black/60 border border-zinc-600 hover:border-orange-400 flex items-center justify-center transition-all"
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 font-bold" />}
                    </button>

                    {/* Imagem do Produto */}
                    <div
                      onClick={() => toggleSelect(p.id)}
                      className="w-full aspect-square bg-zinc-950/90 overflow-hidden relative cursor-pointer"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=80";
                        }}
                      />
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        {/* Título */}
                        <h3
                          className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors"
                          title={p.title}
                        >
                          {p.title}
                        </h3>

                        {/* Preço de / por */}
                        <div className="mt-2">
                          {p.originalPrice > p.currentPrice && (
                            <div className="text-[10px] text-zinc-500 line-through">
                              De: R$ {p.originalPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-sm font-extrabold text-white">
                            R$ {p.currentPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Vendas 🔥 e Comissão 🏷️ */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/60 text-zinc-400">
                        <div className="flex items-center gap-1 text-orange-400 font-semibold" title="Vendas recentes">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                          <span>{p.salesCount > 1000 ? `${(p.salesCount / 1000).toFixed(1)}k` : p.salesCount}</span>
                        </div>

                        <div className="flex items-center gap-0.5 text-emerald-400 font-semibold" title="Comissão estimada">
                          <Percent className="w-2.5 h-2.5" />
                          <span>{p.commissionRate.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Botão Copiar Texto + Link */}
                      <button
                        onClick={() => handleCopyProductText(p)}
                        className="w-full mt-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/50 text-zinc-200 hover:text-white text-[11px] font-semibold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {copiedId === p.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span>Copiar Texto + Link</span>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL: PERSONALIZAÇÃO DO DISPARO (IMAGEM 4)                              */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsDispatchModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Personalização do Disparo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Intervalo & Template */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> INTERVALO
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={dispatchInterval}
                      onChange={(e) => setDispatchInterval(Number(e.target.value))}
                      className="w-20 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400">minutos entre cada envio</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    📄 TEMPLATE
                  </label>
                  <select
                    value={dispatchTemplate}
                    onChange={(e) => setDispatchTemplate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Template 1">Template 1 (Oferta Relâmpago)</option>
                    <option value="Template 2">Template 2 (Direto ao Ponto)</option>
                    <option value="Template 3">Template 3 (Com Economia)</option>
                  </select>

                  <div className="mt-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 font-mono leading-relaxed">
                    {"{OFERTA_RELAMPAGO}"}
                    <br />
                    ★ {"{TITULO_PRODUTO}"} ★
                    <br />
                    &gt; {"{NUMERO_VENDAS}"}
                    <br />
                    🔥 Era ~{"{PRECO_ANTIGO}"}~
                    <br />
                    💥 Agora por *{"{PRECO_PRODUTO}"}* • • {"{DESCONTO_PRODUTO}"} OFF!
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Formato de Mídia, Selos & CTA */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    🖼️ FORMATO DE MÍDIA
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setDispatchMediaFormat("IMAGE")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        dispatchMediaFormat === "IMAGE" ? "bg-zinc-800 text-white" : "text-zinc-400"
                      }`}
                    >
                      Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchMediaFormat("PREVIEW")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dispatchMediaFormat === "PREVIEW" ? "bg-indigo-600 text-white" : "text-zinc-400"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    🏷️ SELOS VISUAIS
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBadgeDiscount(!badgeDiscount)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        badgeDiscount
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}
                    >
                      % Desconto
                    </button>
                    <button
                      type="button"
                      onClick={() => setBadgeFreeShipping(!badgeFreeShipping)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        badgeFreeShipping
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}
                    >
                      Frete Grátis
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    ⚡ CUPOM NO PREÇO & CTA COM IA
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setApplyCouponToPrice(!applyCouponToPrice)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                        applyCouponToPrice
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      Aplicar cupom ao preço
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithCoupon(!showWithCoupon)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                        showWithCoupon
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      Exibir "(com cupom)"
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAiCtaGenerated(true);
                      showToast("✨ Chamada gerada com Inteligência Artificial!");
                    }}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-yellow-400" />
                    {aiCtaGenerated ? "✓ CTA com IA Aplicada" : "⚡ Gerar CTA com IA"}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    T TÍTULO SECUNDÁRIO
                  </label>
                  <input
                    type="text"
                    value={secondaryTitle}
                    onChange={(e) => setSecondaryTitle(e.target.value)}
                    placeholder="Texto abaixo do preço no preview"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMeliDispatch}
                disabled={savingBulk}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                {savingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirmar e Adicionar à Fila
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configuração da API Shopee */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-950/60 border border-orange-500/40 rounded-xl text-orange-400">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Configurar API Shopee Afiliados</h3>
                <p className="text-xs text-zinc-400">
                  Insira suas credenciais da Shopee Open Platform para sincronizar ofertas em tempo real.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* App ID */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Shopee App ID
                </label>
                <input
                  type="text"
                  placeholder="Ex: 100293849102"
                  value={apiConfig.appId}
                  onChange={(e) => setApiConfig({ ...apiConfig, appId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Shopee App Secret (Chave Secreta)
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="Chave secreta gerada no portal da Shopee"
                    value={apiConfig.appSecret}
                    onChange={(e) => setApiConfig({ ...apiConfig, appSecret: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2 pr-10 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Affiliate Tag */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Sua Tag / Código de Afiliado (Sub_id)
                </label>
                <input
                  type="text"
                  placeholder="Ex: achadosdananda-20"
                  value={apiConfig.affiliateTag}
                  onChange={(e) => setApiConfig({ ...apiConfig, affiliateTag: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Resultado do Teste de Conexão */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
                    testResult.success
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-red-950/40 border-red-500/50 text-red-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Dica de como obter as credenciais */}
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                💡 Para obter suas credenciais, acesse o painel{" "}
                <a
                  href="https://affiliate.shopee.com.br/open_api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 underline font-medium hover:text-orange-300"
                >
                  Shopee Affiliate Open Platform
                </a>
                , clique em <b>App Management</b> e copie o <b>App ID</b> e o <b>App Secret</b>.
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !apiConfig.appId}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-zinc-700 disabled:opacity-40"
                >
                  {testingConnection ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                  Testar Conexão
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="text-zinc-400 hover:text-white text-xs px-3 py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="bg-[#ee4d2d] hover:bg-[#d03b1d] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-950/40"
                  >
                    {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar Credenciais
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
