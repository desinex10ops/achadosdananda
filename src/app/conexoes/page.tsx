"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  Cpu,
  Radio,
  Clock,
  ArrowRight
} from "lucide-react";

interface WhatsAppInstance {
  id: string;
  name: string;
  label: string | null;
  nicheSlug: string | null;
  phone: string | null;
  status: "CONNECTED" | "CONNECTING" | "DISCONNECTED";
  qrCode: string | null;
  dailySentCount: number;
  maxDailySends: number;
  createdAt: string;
}

export default function ConexoesPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/instances");
      const json = await res.json();
      if (json.success) {
        setInstances(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstances();
  }, []);

  const handleConnectInstance = async (inst: WhatsAppInstance) => {
    setSelectedInstance(inst);
    setLoadingQr(true);
    setQrCodeData(null);

    try {
      const res = await fetch(`/api/instances/${inst.name}/connect`);
      const json = await res.json();

      if (json.success && json.qrCode) {
        setQrCodeData(json.qrCode);
        showToast(`📲 QR Code gerado para ${inst.label || inst.name}!`);
      } else if (json.error) {
        showToast(`⚠️ ${json.error}`);
      } else {
        showToast("ℹ️ Instância já está conectada ou aguardando.");
      }
    } catch (err: any) {
      showToast("❌ Erro ao conectar com o serviço Evolution API.");
    } finally {
      setLoadingQr(false);
    }
  };

  const handleActivateLocalSession = async (inst: WhatsAppInstance) => {
    try {
      const res = await fetch(`/api/instances/${inst.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONNECTED" }),
      });
      if (res.ok) {
        showToast(`🟢 Chip ${inst.label || inst.name} ativado com sucesso no modo local!`);
        setSelectedInstance(null);
        loadInstances();
      }
    } catch {
      showToast("❌ Erro ao atualizar status.");
    }
  };

  const handleDisconnectInstance = async (inst: WhatsAppInstance) => {
    try {
      const res = await fetch(`/api/instances/${inst.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISCONNECTED" }),
      });
      if (res.ok) {
        showToast(`⚪ Chip ${inst.label || inst.name} desconectado.`);
        loadInstances();
      }
    } catch {
      showToast("❌ Erro ao desconectar.");
    }
  };

  const connectedCount = instances.filter((i) => i.status === "CONNECTED").length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              🔌 Cluster de Chips & Instâncias (Evolution API)
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {connectedCount} de {instances.length} Chips Online
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Isolamento de instâncias por nicho para administrar 200+ grupos sem sobrecarga e blindando seus números contra banimentos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInstances}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar Status</span>
          </button>
        </div>
      </div>

      {/* Info Card de Arquitetura */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-slate-950 p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 ring-2 ring-indigo-500/40">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Blindagem Multi-Chip por Nicho
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                Cada nicho (Moda, Casa, Tech, Bebê, Mercado, Geral) opera com um <strong>Chip dedicado</strong>. Se um nicho disparar 40 ofertas/dia, o volume é diluído de forma segura e humanizada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-400">Capacidade: </span>
              <strong className="text-emerald-400">200 Grupos VIP</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Instâncias por Nicho */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances.map((inst) => {
          const isConnected = inst.status === "CONNECTED";
          const isConnecting = inst.status === "CONNECTING";

          return (
            <div
              key={inst.id}
              className={`rounded-2xl border p-5 bg-white shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                isConnected
                  ? "border-emerald-300 ring-1 ring-emerald-300/40"
                  : isConnecting
                  ? "border-amber-300 bg-amber-50/10"
                  : "border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">
                    {inst.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      isConnected
                        ? "bg-emerald-100 text-emerald-800"
                        : isConnecting
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isConnected
                          ? "bg-emerald-500"
                          : isConnecting
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {isConnected ? "ONLINE" : isConnecting ? "AGUARDANDO QR" : "DESCONECTADO"}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900">
                  {inst.label || inst.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nicho: <span className="font-semibold text-slate-700 capitalize">{inst.nicheSlug}</span>
                </p>

                {/* Métricas do Chip */}
                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Enviados Hoje:</span>
                    <strong className="text-slate-800 font-bold">{inst.dailySentCount} msgs</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Limite Seguro:</span>
                    <strong className="text-emerald-700 font-bold">{inst.maxDailySends}/dia</strong>
                  </div>
                </div>
              </div>

              {/* Botão Conectar / QR Code */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleConnectInstance(inst)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isConnected
                      ? "flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "w-full bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>{isConnected ? "Reconfigurar" : "Conectar WhatsApp"}</span>
                </button>
                {isConnected && (
                  <button
                    onClick={() => handleDisconnectInstance(inst)}
                    className="py-2 px-3 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all"
                    title="Desconectar este chip"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Card de QR Code */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Conectar {selectedInstance.label || selectedInstance.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              1. Abra o WhatsApp no celular com o número deste chip.<br />
              2. Vá em <strong>Dispositivos Conectados</strong> &gt; <strong>Conectar um aparelho</strong>.<br />
              3. Aponte a câmera para o QR Code abaixo:
            </p>

            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 min-h-[260px]">
              {loadingQr ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
                  <span className="text-xs text-slate-500 font-medium">Solicitando QR Code à Evolution API...</span>
                </div>
              ) : qrCodeData ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={qrCodeData.startsWith("data:") ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                    alt="WhatsApp QR Code"
                    className="h-52 w-52 rounded-xl border border-slate-300 shadow-sm"
                  />
                  <span className="text-[11px] font-bold text-emerald-600 animate-pulse">
                    Aguardando leitura do WhatsApp...
                  </span>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Opção 1: Ativação Local no Navegador (Sem Docker) */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <span>🟢</span>
                      <span>Modo Local no PC (WhatsApp Web Ativo)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Se você já está com o <strong>WhatsApp Web</strong> aberto no Chrome com nossa extensão, você não precisa de Docker! Basta ativar este chip para testar o envio automático agora mesmo.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => handleActivateLocalSession(selectedInstance)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ativar este Chip no Navegador (Ficar Online)</span>
                      </button>
                      <a
                        href="https://web.whatsapp.com"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        <span>Abrir WhatsApp Web</span>
                      </a>
                    </div>
                  </div>

                  {/* Opção 2: Servidor Nuvem (Evolution API) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-left space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-[11px]">
                      <span>☁️</span>
                      <span>Servidor Nuvem (Evolution API Headless 24h)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      O serviço headless da porta 8080 não foi detectado no momento. Ele entrará em ação quando você subir o container com <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">docker compose up -d</code> ou na sua VPS.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => handleConnectInstance(selectedInstance)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Tentar Conectar com Evolution API Novamente</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
