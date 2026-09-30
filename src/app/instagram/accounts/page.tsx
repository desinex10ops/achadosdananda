"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Key,
  Clock,
  Instagram,
  Copy,
  Check,
} from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("@achadosdananda");
  const [instagramId, setInstagramId] = useState("17841400000000000");
  const [facebookPageId, setFacebookPageId] = useState("100000000000000");
  const [accessToken, setAccessToken] = useState("");
  const [rateLimitPerHour, setRateLimitPerHour] = useState(60);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(600);
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("22:00");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automations/instagram/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSaveAccount = async () => {
    if (!name || !instagramId) {
      alert("Nome e Instagram ID são obrigatórios.");
      return;
    }

    try {
      const res = await fetch("/api/automations/instagram/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instagramId,
          facebookPageId,
          accessToken: accessToken || "mock_token_dev",
          rateLimitPerHour,
          rateLimitPerDay,
          operatingHoursStart,
          operatingHoursEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        loadAccounts();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyWebhook = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/api/webhooks/instagram`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <Users className="h-5 w-5 text-rose-500" />
              <span>Contas Conectadas do Instagram</span>
            </h1>
            <p className="text-xs text-slate-500">
              Configurações de API oficial Meta Graph API, Webhooks e Limites de Envio.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-500"
        >
          <Plus className="h-4 w-4" />
          <span>Conectar Nova Conta</span>
        </button>
      </div>

      {/* Webhook Meta Setup Card */}
      <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50/60 to-purple-50/60 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white">
              <Instagram className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Configuração do Webhook no Meta for Developers
            </h3>
          </div>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold">
            Meta API v19.0
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          No seu aplicativo Meta Developer (Instagram Graph API), adicione os produtos <strong>Webhooks</strong> e assine os campos <code>comments</code> e <code>messages</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
              <span>URL de Retorno (Callback URL)</span>
              <button
                onClick={handleCopyWebhook}
                className="text-rose-600 hover:text-rose-500 flex items-center gap-1 font-normal text-xs"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>
            <div className="text-xs font-mono text-slate-800 break-all select-all">
              /api/webhooks/instagram
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase">
              Token de Verificação (Verify Token)
            </div>
            <div className="text-xs font-mono text-slate-800 font-bold select-all">
              achados_nanda_secret
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-amber-500 text-white font-bold">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{acc.name}</h3>
                  <span className="text-[11px] text-slate-400">ID: {acc.instagramId}</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  acc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>{acc.isActive ? "Ativa" : "Inativa"}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Limite por Hora:</span>
                <strong className="text-slate-800">{acc.rateLimitPerHour} mensagens/h</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Limite Diário:</span>
                <strong className="text-slate-800">{acc.rateLimitPerDay} mensagens/dia</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Horário de Atendimento:</span>
                <strong className="text-slate-800">
                  {acc.operatingHoursStart} às {acc.operatingHoursEnd}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Regras Vinculadas:</span>
                <strong className="text-slate-800">{acc._count?.automations || 0} ativas</strong>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Proteção anti-bloqueio ativa</span>
              </span>
              <button
                onClick={() => {
                  setName(acc.name);
                  setInstagramId(acc.instagramId);
                  setFacebookPageId(acc.facebookPageId || "");
                  setRateLimitPerHour(acc.rateLimitPerHour);
                  setRateLimitPerDay(acc.rateLimitPerDay);
                  setOperatingHoursStart(acc.operatingHoursStart || "08:00");
                  setOperatingHoursEnd(acc.operatingHoursEnd || "22:00");
                  setShowModal(true);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-500"
              >
                Configurar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Conectar / Editar Conta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Configurar Conta do Instagram
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome da Conta (@)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  placeholder="@achadosdananda"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Instagram Account ID
                  </label>
                  <input
                    type="text"
                    value={instagramId}
                    onChange={(e) => setInstagramId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                    placeholder="17841400000000000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    value={facebookPageId}
                    onChange={(e) => setFacebookPageId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                    placeholder="100000000000000"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Access Token (Meta Graph API)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  placeholder="EAAB... (Deixe em branco para modo simulado/mock)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Limite por Hora
                  </label>
                  <input
                    type="number"
                    value={rateLimitPerHour}
                    onChange={(e) => setRateLimitPerHour(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Limite Diário
                  </label>
                  <input
                    type="number"
                    value={rateLimitPerDay}
                    onChange={(e) => setRateLimitPerDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Início Atendimento
                  </label>
                  <input
                    type="time"
                    value={operatingHoursStart}
                    onChange={(e) => setOperatingHoursStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fim Atendimento
                  </label>
                  <input
                    type="time"
                    value={operatingHoursEnd}
                    onChange={(e) => setOperatingHoursEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAccount}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
