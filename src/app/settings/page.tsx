"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, ShieldAlert, CheckCircle2, Save, Database, User } from "lucide-react";

export default function SettingsPage() {
  const [antiRepeatHours, setAntiRepeatHours] = useState("48");
  const [defaultInterval, setDefaultInterval] = useState("30");
  const [maxPerHour, setMaxPerHour] = useState("4");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ⚙️ Configurações do Sistema
          </h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Geral
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Ajuste as regras de segurança contra repetição de ofertas e parâmetros globais.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Anti-Repetição (Seção 16) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Regras de Anti-Repetição</h3>
              <p className="text-xs text-slate-500">
                Evita que a mesma oferta seja postada com frequência excessiva no mesmo grupo.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Não repetir o mesmo produto no mesmo grupo durante:
            </label>
            <select
              value={antiRepeatHours}
              onChange={(e) => setAntiRepeatHours(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none"
            >
              <option value="24">24 horas</option>
              <option value="48">48 horas (Recomendado)</option>
              <option value="168">7 dias</option>
              <option value="720">30 dias</option>
            </select>
          </div>
        </div>

        {/* Frequência Padrão (Seção 17) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <SettingsIcon className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Controle de Frequência Padrão</h3>
              <p className="text-xs text-slate-500">
                Limites automáticos sugeridos ao criar novos grupos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intervalo mínimo padrão entre postagens (minutos)
              </label>
              <input
                type="number"
                value={defaultInterval}
                onChange={(e) => setDefaultInterval(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Limite máximo padrão por hora
              </label>
              <input
                type="number"
                value={maxPerHour}
                onChange={(e) => setMaxPerHour(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Banco de Dados / Infraestrutura */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Database className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Banco de Dados & Armazenamento</h3>
              <p className="text-xs text-slate-500">
                Informações de conexão e persistência do sistema.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Driver ativo:</span>
              <span className="font-semibold text-emerald-600">SQLite (dev.db) - Pronto para PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span>Docker Compose:</span>
              <span className="font-mono text-slate-800">docker-compose.yml configurado (PostgreSQL 16)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </div>
  );
}
