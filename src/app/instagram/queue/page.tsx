"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ListOrdered,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  ArrowLeft,
  Send,
  MessageCircle,
  Heart,
  RefreshCw,
} from "lucide-react";

export default function QueuePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const loadQueue = async () => {
    try {
      setLoading(true);
      const url =
        selectedStatus === "ALL"
          ? "/api/automations/instagram/queue"
          : `/api/automations/instagram/queue?status=${selectedStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [selectedStatus]);

  const handleDispatchNow = async () => {
    try {
      setDispatching(true);
      const res = await fetch("/api/automations/instagram/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch", limit: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        await loadQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch("/api/automations/instagram/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", jobId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadQueue();
      }
    } catch (err) {
      console.error(err);
    }
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
              <ListOrdered className="h-5 w-5 text-amber-500" />
              <span>Fila de Disparo do Instagram</span>
            </h1>
            <p className="text-xs text-slate-500">
              Controle anti-ban com atraso humanizado e chaves de idempotência anti-duplicação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadQueue}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleDispatchNow}
            disabled={dispatching}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{dispatching ? "Processando..." : "Processar Fila Agora"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedStatus("PENDING")}
          className={`rounded-2xl border p-4 text-left transition shadow-sm ${
            selectedStatus === "PENDING"
              ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 uppercase">
            <span>Pendentes</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.PENDING}</div>
          <span className="text-[11px] text-slate-400">Aguardando atraso humanizado</span>
        </button>

        <button
          onClick={() => setSelectedStatus("PROCESSING")}
          className={`rounded-2xl border p-4 text-left transition shadow-sm ${
            selectedStatus === "PROCESSING"
              ? "border-blue-400 bg-blue-50/50 ring-2 ring-blue-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 uppercase">
            <span>Processando</span>
            <RefreshCw className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.PROCESSING}</div>
          <span className="text-[11px] text-slate-400">Em envio para a API</span>
        </button>

        <button
          onClick={() => setSelectedStatus("COMPLETED")}
          className={`rounded-2xl border p-4 text-left transition shadow-sm ${
            selectedStatus === "COMPLETED"
              ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 uppercase">
            <span>Concluídos</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.COMPLETED}</div>
          <span className="text-[11px] text-slate-400">Entregues com sucesso</span>
        </button>

        <button
          onClick={() => setSelectedStatus("FAILED")}
          className={`rounded-2xl border p-4 text-left transition shadow-sm ${
            selectedStatus === "FAILED"
              ? "border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-600 uppercase">
            <span>Falhas</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.FAILED}</div>
          <span className="text-[11px] text-slate-400">Requerem atenção</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED"].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`rounded-lg px-3 py-1.5 transition ${
              selectedStatus === st
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {st === "ALL" ? "Todos os Jobs" : st}
          </button>
        ))}
      </div>

      {/* Tabela de Jobs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Destinatário</th>
                <th className="px-4 py-3">Regra</th>
                <th className="px-4 py-3">Agendado Para</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {jobs.map((job) => {
                let payloadObj: any = {};
                try {
                  payloadObj = JSON.parse(job.payload);
                } catch {}

                return (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {job.actionType === "SEND_DM" && (
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-100 text-purple-700">
                            <Send className="h-3 w-3" />
                          </span>
                        )}
                        {job.actionType === "REPLY_COMMENT" && (
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-blue-700">
                            <MessageCircle className="h-3 w-3" />
                          </span>
                        )}
                        {job.actionType === "LIKE_COMMENT" && (
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-pink-100 text-pink-700">
                            <Heart className="h-3 w-3" />
                          </span>
                        )}
                        <span>{job.actionType}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900">
                      @{job.targetUsername || job.targetUserId}
                    </td>

                    <td className="px-4 py-3 text-slate-500 truncate max-w-xs">
                      {job.automation?.name || "Regra Geral"}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {new Date(job.scheduledFor).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          job.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : job.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : job.status === "PROCESSING"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.errorMessage && (
                        <div className="text-[10px] text-rose-600 mt-1 truncate max-w-xs" title={job.errorMessage}>
                          {job.errorMessage}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {job.status === "FAILED" && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Tentar Novamente</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Nenhum job na fila no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
