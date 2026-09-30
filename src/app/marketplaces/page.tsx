"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Settings,
  Layers,
  Key,
  Save,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface Marketplace {
  id: string;
  name: string;
  slug: string;
  badgeColor: string;
  isActive: boolean;
  commissionRate: number;
  affiliateTag: string | null;
  appId?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  _count?: { products: number; offers: number };
}

export default function MarketplacesPage() {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarketplace, setSelectedMarketplace] = useState<Marketplace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [affiliateTag, setAffiliateTag] = useState("");
  const [appId, setAppId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMarketplaces = async () => {
    try {
      const res = await fetch("/api/marketplaces");
      const json = await res.json();
      if (json.success) {
        setMarketplaces(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaces();
  }, []);

  const openConfigModal = (m: Marketplace) => {
    setSelectedMarketplace(m);
    setAffiliateTag(m.affiliateTag || "");
    setAppId(m.appId || "");
    setApiKey(m.apiKey || "");
    setApiSecret(m.apiSecret || "");
    setCommissionRate(String(m.commissionRate || ""));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarketplace) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/marketplaces/${selectedMarketplace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateTag,
          appId,
          apiKey,
          apiSecret,
          commissionRate: parseFloat(commissionRate) || 0,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadMarketplaces();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              🏪 Marketplaces & Chaves de Afiliado
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {marketplaces.length} integrados
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure suas tags de afiliado, App IDs e credenciais de API para Shopee, Mercado Livre, Amazon e mais.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketplaces.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">
                        {m.slug}
                      </span>
                    </div>
                  </div>
                  <Badge variant={m.isActive ? "success" : "neutral"}>
                    {m.isActive ? "Ativo" : "Pausado"}
                  </Badge>
                </div>

                <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tag de Afiliado:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {m.affiliateTag || "Não configurada"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">App ID / Client ID:</span>
                    <span className="font-mono text-slate-700">
                      {m.appId ? "••••••••" : "Não preenchido"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Chave / Secret:</span>
                    <span className="font-mono text-slate-700">
                      {m.apiKey || m.apiSecret ? "••••••••••••" : "Opcional"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Comissão Estimada:</span>
                    <span className="font-bold text-emerald-600">
                      {m.commissionRate}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Conexão Segura
                </span>

                <button
                  onClick={() => openConfigModal(m)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Configurar Chaves</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Configuração de Chaves & Credenciais */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configurar Chaves - ${selectedMarketplace?.name}`}
        description="Insira sua Tag de Afiliado e credenciais de API oficiais do marketplace."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tag / ID de Afiliado * (Usada nos seus links)
            </label>
            <input
              type="text"
              value={affiliateTag}
              onChange={(e) => setAffiliateTag(e.target.value)}
              placeholder="Ex: achadosdananda-20 ou nanda_afiliado"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Sua identificação oficial fornecida pelo marketplace para computar suas vendas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                App ID / Client ID (Opcional)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ex: 100234589"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxa de Comissão Média (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="Ex: 8.5"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              API Key / Access Token (Opcional para APIs oficiais)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave de API aqui"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              API Secret / Client Secret (Opcional)
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Cole seu client secret aqui"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Salvando..." : "Salvar Chaves"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
