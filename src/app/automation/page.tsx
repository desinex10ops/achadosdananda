"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  PlusCircle,
  Play,
  Pause,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  actionType: string;
  actionPayload: string;
}

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [conditionField, setConditionField] = useState("discountPercentage");
  const [conditionOperator, setConditionOperator] = useState(">=");
  const [conditionValue, setConditionValue] = useState("30");
  const [actionType, setActionType] = useState("ADD_TO_QUEUE");

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/automation");
      const json = await res.json();
      if (json.success) {
        setRules(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/automation/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentState }),
      });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra de automação?")) return;
    try {
      await fetch(`/api/automation/${id}`, { method: "DELETE" });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          conditionField,
          conditionOperator,
          conditionValue,
          actionType,
          actionPayload: {},
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setName("");
        fetchRules();
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
              🤖 Regras de Automação
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Piloto Automático
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Crie gatilhos condicionais (SE... ENTÃO...) para priorizar ou colocar ofertas automaticamente na fila.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nova Regra</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
          Nenhuma regra configurada ainda. Clique em "Nova Regra" para criar sua primeira automação.
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const fieldLabel =
              rule.conditionField === "discountPercentage"
                ? "Desconto"
                : rule.conditionField === "hasCoupon"
                ? "Cupom Disponível"
                : "Categoria";

            const actionLabel =
              rule.actionType === "ADD_TO_QUEUE"
                ? "Adicionar automaticamente à Fila"
                : "Definir Alta Prioridade";

            return (
              <div
                key={rule.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                    <Badge variant={rule.isActive ? "success" : "neutral"}>
                      {rule.isActive ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                      SE: {fieldLabel} {rule.conditionOperator} {rule.conditionValue}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                      ENTÃO: {actionLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(rule.id, rule.isActive)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {rule.isActive ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-amber-600" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Ativar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-xl border border-slate-200 p-2 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Regra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Regra de Automação"
        description="Defina uma lógica simples para acionar ações automáticas sobre ofertas."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Regra *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Auto-Fila para Descontos Tech >= 30%"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Condição (SE)
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Campo
                </label>
                <select
                  value={conditionField}
                  onChange={(e) => setConditionField(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none bg-white"
                >
                  <option value="discountPercentage">Desconto (%)</option>
                  <option value="category">Categoria</option>
                  <option value="hasCoupon">Cupom Disponível</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Operador
                </label>
                <select
                  value={conditionOperator}
                  onChange={(e) => setConditionOperator(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none bg-white font-mono"
                >
                  <option value=">=">&gt;= (Maior ou igual)</option>
                  <option value=">">&gt; (Maior que)</option>
                  <option value="==">== (Igual a)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Valor
                </label>
                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Ex: 30 ou Tecnologia"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none bg-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Ação (ENTÃO)
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ação Executada
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none bg-white"
              >
                <option value="ADD_TO_QUEUE">Adicionar automaticamente à Fila de Ofertas</option>
                <option value="SET_PRIORITY">Marcar com Alta Prioridade (Destaque)</option>
              </select>
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
              Salvar Regra
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
