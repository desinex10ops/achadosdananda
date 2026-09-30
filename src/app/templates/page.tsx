"use client";

import React, { useState, useEffect } from "react";
import {
  Palette,
  PlusCircle,
  Copy,
  Trash2,
  Edit3,
  Check,
  Star,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface Template {
  id: string;
  name: string;
  type: string;
  emoji: string;
  header: string;
  structure: string;
  cta: string;
  footer: string | null;
  showOriginalPrice: boolean;
  showDiscount: boolean;
  showCoupon: boolean;
  showShipping: boolean;
  isDefault: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [header, setHeader] = useState("");
  const [structure, setStructure] = useState("");
  const [cta, setCta] = useState("👇 COMPRE PELO LINK ABAIXO:");
  const [footer, setFooter] = useState("");
  const [showOriginalPrice, setShowOriginalPrice] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showCoupon, setShowCoupon] = useState(true);
  const [showShipping, setShowShipping] = useState(true);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openNewModal = () => {
    setEditingTemplate(null);
    setName("");
    setEmoji("🔥");
    setHeader("");
    setStructure("🔥 {TITULO} 🔥\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n💰 {DESCONTO} OFF\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 COMPRAR AGORA:\n{LINK}");
    setCta("👇 COMPRE PELO LINK ABAIXO:");
    setFooter("Achados da Nanda ✨");
    setShowOriginalPrice(true);
    setShowDiscount(true);
    setShowCoupon(true);
    setShowShipping(true);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setEmoji(t.emoji);
    setHeader(t.header);
    setStructure(t.structure);
    setCta(t.cta);
    setFooter(t.footer || "");
    setShowOriginalPrice(t.showOriginalPrice);
    setShowDiscount(t.showDiscount);
    setShowCoupon(t.showCoupon);
    setShowShipping(t.showShipping);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: id }),
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        emoji,
        header: header || name,
        structure,
        cta,
        footer,
        showOriginalPrice,
        showDiscount,
        showCoupon,
        showShipping,
      };

      if (editingTemplate) {
        await fetch(`/api/templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const insertTag = (tag: string) => {
    setStructure((prev) => prev + " " + tag);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Modelos de Mensagem (Templates)
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              {templates.length} templates
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Personalize textos, emojis e formatos para chamar a atenção nos seus grupos de afiliados.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Criar Novo Template</span>
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tpl.emoji}</span>
                    <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                  </div>
                  {tpl.isDefault && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                      Padrão
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-slate-950 p-3.5 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed line-clamp-8 border border-slate-800">
                  {tpl.structure}
                </div>
              </div>

              {/* Actions: Duplicate, Edit, Delete */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleDuplicate(tpl.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Duplicar modelo"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicar</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(tpl)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Editar"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Editar Template" : "Novo Template"}
        description="Defina os textos e variáveis dinâmicas que serão substituídas automaticamente."
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emoji
              </label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-center text-lg focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Template *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Oferta Relâmpago VIP"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Estrutura do Texto *
              </label>
              <span className="text-[10px] text-slate-400">
                Clique nas tags abaixo para inserir
              </span>
            </div>

            {/* Quick insert tag buttons */}
            <div className="flex flex-wrap gap-1 mb-2">
              {["{TITULO}", "{PRECO_DE}", "{PRECO_POR}", "{DESCONTO}", "{VALOR_ECONOMIZADO}", "{CUPOM}", "{FRETE}", "{LINK}"].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => insertTag(tag)}
                  className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 hover:bg-rose-100 hover:text-rose-700"
                >
                  +{tag}
                </button>
              ))}
            </div>

            <textarea
              rows={8}
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chamada de Ação (CTA)
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rodapé / Assinatura
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Achados da Nanda ✨"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
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
              Salvar Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
