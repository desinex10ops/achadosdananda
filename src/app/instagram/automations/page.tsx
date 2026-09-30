"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  PlusCircle,
  Play,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Search,
} from "lucide-react";

export default function AutomationsListPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automations/instagram");
      const data = await res.json();
      if (data.success) {
        setAutomations(data.automations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/automations/instagram/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !currentStatus } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover a automação "${name}"?`)) return;
    try {
      const res = await fetch(`/api/automations/instagram/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = automations.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.keywords.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
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
              <Zap className="h-5 w-5 text-rose-500" />
              <span>Regras de Automação do Instagram</span>
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie gatilhos, respostas pré-configuradas e switches de ativação.
            </p>
          </div>
        </div>

        <Link
          href="/instagram/builder"
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-500 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nova Regra</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou palavras-chave..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map((aut) => {
          const kwList = aut.keywords.split(",").slice(0, 6);
          return (
            <div
              key={aut.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  {/* Switch Ativo/Inativo */}
                  <button
                    onClick={() => handleToggleActive(aut.id, aut.isActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      aut.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        aut.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>

                  <h3 className="font-semibold text-slate-900 text-sm">{aut.name}</h3>

                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {aut.account?.name || "@achadosdananda"}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                    {aut.triggerType}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">Palavras:</span>
                  {kwList.map((kw: string, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100"
                    >
                      {kw.trim()}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>
                    Acionamentos: <strong className="text-slate-700">{aut.totalTriggered}</strong>
                  </span>
                  <span>
                    Sucessos: <strong className="text-emerald-600">{aut.totalSuccess}</strong>
                  </span>
                  <span>
                    Atraso: <strong className="text-slate-700">{aut.delaySeconds}s + {aut.jitterSeconds}s</strong>
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Link
                  href={`/instagram/builder?id=${aut.id}&test=true`}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5"
                >
                  <Play className="h-3 w-3" />
                  <span>Testar</span>
                </Link>
                <Link
                  href={`/instagram/builder?id=${aut.id}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 transition"
                  title="Editar"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => handleDelete(aut.id, aut.name)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Zap className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs text-slate-500">Nenhuma regra encontrada para a busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
