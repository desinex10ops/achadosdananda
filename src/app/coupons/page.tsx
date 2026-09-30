"use client";

import React, { useState, useEffect } from "react";
import {
  Ticket,
  PlusCircle,
  Copy,
  Check,
  Clock,
  Trash2,
  ExternalLink,
  Store,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";

interface Marketplace {
  id: string;
  name: string;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  minSpend: number | null;
  validUntil: string | null;
  category: string | null;
  status: string;
  notes?: string | null;
  marketplace: { id: string; name: string };
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Coupon Form
  const [marketplaceId, setMarketplaceId] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [category, setCategory] = useState("Geral");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        fetch(`/api/coupons?status=${filterStatus}`),
        fetch("/api/marketplaces"),
      ]);
      const cJson = await cRes.json();
      const mJson = await mRes.json();

      if (cJson.success) setCoupons(cJson.data);
      if (mJson.success && mJson.data.length > 0) {
        setMarketplaces(mJson.data);
        if (!marketplaceId) setMarketplaceId(mJson.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleCopy = async (codeStr: string) => {
    await navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount || !marketplaceId) return;

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplaceId,
          code,
          discount,
          minSpend,
          validUntil: validUntil || null,
          category,
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setCode("");
        setDiscount("");
        setMinSpend("");
        setValidUntil("");
        setNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              🎟️ Central de Cupons
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {coupons.length} cupons cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre e monitore códigos de desconto para vincular automaticamente às suas ofertas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Cadastrar Novo Cupom</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs">
        <Filter className="h-4 w-4 text-slate-400 ml-2" />
        <span className="font-semibold text-slate-600 mr-2">Status:</span>
        {["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filterStatus === st
                ? "bg-rose-600 text-white font-semibold"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {st === "ALL"
              ? "Todos"
              : st === "ACTIVE"
              ? "Ativos"
              : st === "EXPIRING_SOON"
              ? "Vence em Breve"
              : "Expirados"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
          Nenhum cupom encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {coupon.marketplace.name}
                  </span>
                  {coupon.status === "EXPIRING_SOON" ? (
                    <Badge variant="warning">Vence em Breve</Badge>
                  ) : coupon.status === "EXPIRED" ? (
                    <Badge variant="danger">Expirado</Badge>
                  ) : (
                    <Badge variant="success">Ativo</Badge>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                  <span className="font-mono text-base font-bold text-slate-900">
                    {coupon.code}
                  </span>
                  <button
                    onClick={() => handleCopy(coupon.code)}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 border border-slate-200 hover:bg-slate-50 shadow-2xs flex items-center gap-1"
                  >
                    {copiedCode === coupon.code ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Benefício:</span>
                    <span className="font-bold text-emerald-600">{coupon.discount}</span>
                  </div>
                  {coupon.minSpend && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gasto Mínimo:</span>
                      <span className="font-semibold">{formatCurrency(coupon.minSpend)}</span>
                    </div>
                  )}
                  {coupon.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validade:</span>
                      <span className="font-medium text-slate-700">
                        {new Date(coupon.validUntil).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categoria:</span>
                    <span>{coupon.category || "Geral"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => handleDelete(coupon.id)}
                  className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Excluir cupom"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Cupom */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Cupom"
        description="Adicione um código de cupom para usar nas suas mensagens automáticas."
        maxWidth="md"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Marketplace *
            </label>
            <select
              value={marketplaceId}
              onChange={(e) => setMarketplaceId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            >
              {marketplaces.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código do Cupom *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: QUERO20"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold text-xs text-slate-900 focus:border-rose-500 focus:outline-none uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Desconto *
              </label>
              <input
                type="text"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Ex: R$ 20 OFF ou 15%"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Mínimo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={minSpend}
                onChange={(e) => setMinSpend(e.target.value)}
                placeholder="Ex: 99.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Validade
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoria
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Tecnologia, Casa, Moda ou Geral"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
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
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm"
            >
              Salvar Cupom
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
