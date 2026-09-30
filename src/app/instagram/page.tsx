import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Instagram,
  PlusCircle,
  Zap,
  MessageCircle,
  Heart,
  Send,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstagramDashboardPage() {
  // Busca métricas do banco de dados
  const [
    accountsCount,
    automations,
    queueStats,
    recentLogs,
    links,
  ] = await Promise.all([
    prisma.instagramAccount.count(),
    prisma.instagramAutomation.findMany({
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instagramJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.instagramLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        account: { select: { name: true } },
      },
    }),
    prisma.affiliateLink.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Se não existir nenhuma conta cadastrada, cria uma conta padrão demonstrativa conectada
  let account = await prisma.instagramAccount.findFirst();
  if (!account) {
    account = await prisma.instagramAccount.create({
      data: {
        name: "@achadosdananda",
        instagramId: "17841400000000000",
        facebookPageId: "100000000000000",
        accessToken: "mock_token_achados_da_nanda",
        webhookSecret: "achados_nanda_secret",
        webhookVerified: true,
        rateLimitPerHour: 60,
        rateLimitPerDay: 600,
        operatingHoursStart: "08:00",
        operatingHoursEnd: "22:00",
      },
    });

    // Cria também uma automação padrão "EU QUERO"
    await prisma.instagramAutomation.create({
      data: {
        name: "Disparo Automático 'EU QUERO'",
        accountId: account.id,
        triggerType: "COMMENT_ANY",
        matchType: "CONTAINS",
        keywords: "EU QUERO, QUERO, LINK, PREÇO, QUAL O VALOR",
        caseSensitive: false,
        ignoreAccents: true,
        replyInPublic: true,
        publicReplyTemplate: "Oi @{username}! Enviamos o link detalhado no seu Direct 💖 Dá uma olhadinha!",
        likeComment: true,
        sendDirectMessage: true,
        dmMessageTemplate: "Olá @{username}! Tudo bem?\n\nIdentificamos que você pediu o link da oferta:\n🔗 {link}\n\nAproveite antes que o preço suba ou o estoque acabe!",
        dmButtonText: "Ver Oferta",
        delaySeconds: 15,
        jitterSeconds: 10,
        tagsToAdd: "interessado,oferta_comentada",
        customLink: links[0]?.affiliateUrl || "https://achadosdananda.com.br/r/promocao",
      },
    });
  }

  // Agrega contadores de jobs
  const jobStats: Record<string, number> = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
  for (const item of queueStats) {
    jobStats[item.status] = item._count._all;
  }

  const totalAutomations = automations.length;
  const activeAutomations = automations.filter((a) => a.isActive).length;
  const totalTriggered = automations.reduce((acc, curr) => acc + curr.totalTriggered, 0);
  const totalSuccess = automations.reduce((acc, curr) => acc + curr.totalSuccess, 0);
  const successRate = totalTriggered > 0 ? Math.round((totalSuccess / totalTriggered) * 100) : 100;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
              <Instagram className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Automação de Instagram
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Motor de disparo automático por comentários e DMs, 100% via regras e API oficial Meta.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/instagram/builder"
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-500"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Automação</span>
          </Link>
          <Link
            href="/instagram/queue"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Fila ({jobStats.PENDING})</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Regras Ativas */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Regras Ativas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {activeAutomations}
            </span>
            <span className="text-xs text-slate-400">de {totalAutomations} criadas</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Motor de regras operando</span>
          </div>
        </div>

        {/* Card 2: Interações Detectadas */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Comentários Processados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MessageCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {totalTriggered}
            </span>
            <span className="text-xs text-slate-400">gatilhos acionados</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <Heart className="h-3.5 w-3.5" />
            <span>Curtidas e respostas automáticas</span>
          </div>
        </div>

        {/* Card 3: DMs Entregues */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              DMs Enviadas com Link
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {totalSuccess}
            </span>
            <span className="text-xs text-slate-400">mensagens entregues</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-600 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{successRate}% taxa de sucesso</span>
          </div>
        </div>

        {/* Card 4: Fila e Proteção Anti-Ban */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fila & Anti-Ban
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {jobStats.PENDING}
            </span>
            <span className="text-xs text-slate-400">em espera humanizada</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>Jitter de 10s a 25s por disparo</span>
          </div>
        </div>
      </div>

      {/* Grid: Automações Ativas & Atividade em Tempo Real */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Lista de Automações */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-rose-500" />
              <span>Regras de Automação Configuradas</span>
            </h2>
            <Link
              href="/instagram/automations"
              className="text-xs font-semibold text-rose-600 hover:text-rose-500 flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {automations.map((aut) => {
              const kwList = aut.keywords.split(",").slice(0, 4);
              return (
                <div
                  key={aut.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          aut.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <h3 className="font-semibold text-slate-900 text-sm">{aut.name}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {aut.triggerType === "COMMENT_ANY" ? "Qualquer Post/Reel" : aut.triggerType}
                      </span>
                    </div>

                    {/* Palavras-chave */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-slate-400 font-medium">Palavras:</span>
                      {kwList.map((kw, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-100"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 truncate max-w-md">
                      DM: &quot;{aut.dmMessageTemplate.slice(0, 75)}...&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/instagram/builder?id=${aut.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/instagram/builder?id=${aut.id}&test=true`}
                      className="rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition flex items-center gap-1.5"
                    >
                      <Play className="h-3 w-3" />
                      <span>Testar Regra</span>
                    </Link>
                  </div>
                </div>
              );
            })}

            {automations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <Instagram className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">
                  Nenhuma regra de automação criada ainda
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Crie sua primeira regra para responder comentários como &quot;EU QUERO&quot; no Direct.
                </p>
                <div className="mt-4">
                  <Link
                    href="/instagram/builder"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Criar Primeira Automação</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Feed de Atividades & Logs Recentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-500" />
              <span>Atividade em Tempo Real</span>
            </h2>
            <Link
              href="/instagram/logs"
              className="text-xs font-semibold text-rose-600 hover:text-rose-500"
            >
              Ver logs
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
            {recentLogs.map((log) => {
              const isSuccess = log.level === "SUCCESS";
              const isError = log.level === "ERROR";
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      isSuccess
                        ? "bg-emerald-100 text-emerald-700"
                        : isError
                        ? "bg-rose-100 text-rose-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isError ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 leading-snug truncate">
                      {log.message}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span>{log.eventType}</span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {recentLogs.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">
                Nenhuma atividade registrada ainda.
              </p>
            )}
          </div>

          {/* Webhook Status Widget */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Endpoint do Webhook
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cole esta URL no painel do Meta for Developers (Instagram Graph API Webhooks):
            </p>
            <div className="rounded-xl bg-slate-900 p-2.5 text-[11px] font-mono text-slate-200 select-all break-all">
              /api/webhooks/instagram
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Token de Verificação:</span>
              <span className="font-mono text-slate-700 font-semibold">achados_nanda_secret</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
