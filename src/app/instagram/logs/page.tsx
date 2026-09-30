"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const url =
        filterLevel === "ALL"
          ? "/api/automations/instagram/logs"
          : `/api/automations/instagram/logs?level=${filterLevel}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterLevel]);

  const filteredLogs = logs.filter(
    (l) =>
      l.message.toLowerCase().includes(search.toLowerCase()) ||
      (l.instagramUsername && l.instagramUsername.toLowerCase().includes(search.toLowerCase())) ||
      l.eventType.toLowerCase().includes(search.toLowerCase())
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
              <History className="h-5 w-5 text-rose-500" />
              <span>Logs & Auditoria de Automações</span>
            </h1>
            <p className="text-xs text-slate-500">
              Rastreabilidade detalhada de eventos recebidos, correspondências de regras e envios.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por mensagem, usuário @ ou evento..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {["ALL", "SUCCESS", "INFO", "WARN", "ERROR"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterLevel === lvl
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Mensagem</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Automação</th>
                <th className="px-4 py-3 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => {
                const isSuccess = log.level === "SUCCESS";
                const isError = log.level === "ERROR";
                const isWarn = log.level === "WARN";

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isSuccess
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isError
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : isWarn
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {log.eventType}
                    </td>

                    <td className="px-4 py-3 text-slate-800 max-w-md">
                      <div>{log.message}</div>
                      {log.details && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-sm">
                          {log.details}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {log.instagramUsername ? `@${log.instagramUsername}` : log.instagramUserId || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {log.automation?.name || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-500 text-right whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Nenhum registro de log encontrado.
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
