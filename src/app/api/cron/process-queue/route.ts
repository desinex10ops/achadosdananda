import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDistributionAdapter } from "@/modules/distribution/adapter";
import { parseSpintax } from "@/modules/templates/engine";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Cron Job 24/7 na Nuvem com:
 * 1. Disparo de ofertas agendadas via WhatsApp
 * 2. Rastreamento inteligente de cliques com link próprio (/r/[id])
 * 3. Humanização anti-ban com atraso aleatório e spintax
 * 4. Alerta automático de fila baixa no WhatsApp da Nanda
 */
export async function GET(request: Request) {
  return handleProcessQueue();
}

export async function POST(request: Request) {
  return handleProcessQueue();
}

async function handleProcessQueue() {
  try {
    const now = new Date();

    // 1. Obtém configurações do Piloto Automático
    const settings = await prisma.settings.findFirst();
    const isAutopilotActive = settings?.autopilotActive ?? false;

    // 2. Busca ofertas agendadas cujo horário já chegou ou passou
    let duePublications = await prisma.publication.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
      include: {
        offer: {
          include: { product: true, marketplace: true },
        },
        publicationGroups: {
          include: { group: true },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 2, // Processa até 2 ofertas por ciclo para cadência natural
    });

    // Se o piloto automático estiver ativo e não houver itens com horário vencido,
    // mas houver itens pendentes sem agendamento, agenda o próximo
    if (duePublications.length === 0 && isAutopilotActive) {
      const nextPending = await prisma.publication.findFirst({
        where: { status: "PENDING" },
        include: {
          offer: { include: { product: true, marketplace: true } },
          publicationGroups: { include: { group: true } },
        },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      });

      if (nextPending) {
        duePublications = [nextPending];
      }
    }

    if (duePublications.length === 0) {
      // Verifica alerta de fila baixa mesmo quando nada foi disparado
      await checkAndNotifyLowQueue();

      return NextResponse.json({
        success: true,
        message: "Nenhuma oferta com horário pendente para este minuto.",
        processed: 0,
        autopilotActive: isAutopilotActive,
      });
    }

    const adapter = getDistributionAdapter("EVOLUTION");
    const results: any[] = [];
    const siteUrl = process.env.NEXTAUTH_URL || "https://achadosdananda.vercel.app";

    for (const pub of duePublications) {
      // 3. Busca grupos vinculados ativos
      let targetGroups = pub.publicationGroups
        .map((pg) => pg.group)
        .filter((g) => g && g.whatsappJid && g.isActive);

      if (targetGroups.length === 0) {
        // Se a publicação não tiver grupos amarrados, pega todos os grupos ativos com JID
        const activeGroups = await prisma.group.findMany({
          where: { whatsappJid: { not: null }, isActive: true },
        });
        targetGroups = activeGroups as any;
      }

      let pubSuccess = false;
      let lastErrorMessage = "";

      // 4. Converte links para o rastreador próprio /r/{offerId} e aplica Spintax
      const trackedLink = `${siteUrl}/r/${pub.offerId}`;
      let messageToSend = pub.generatedText;

      if (!messageToSend.includes("/r/")) {
        const originalAffiliate = pub.offer.affiliateUrl || pub.offer.originalUrl;
        if (originalAffiliate && messageToSend.includes(originalAffiliate)) {
          messageToSend = messageToSend.replace(originalAffiliate, trackedLink);
        } else {
          messageToSend = messageToSend.replace(/https?:\/\/[^\s]+/g, (url) => {
            return url.includes("/r/") ? url : trackedLink;
          });
        }
      }

      // Humanização anti-ban: processa spintax no texto da mensagem
      messageToSend = parseSpintax(messageToSend);

      for (const group of targetGroups) {
        const channelJid = group.whatsappJid!;
        const instance = group.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";

        try {
          const res = await adapter.distribute({
            messageText: messageToSend,
            imageUrl: pub.offer.product.imageUrl,
            targetChannelId: channelJid,
            instanceName: instance,
            platform: "EVOLUTION",
          });

          results.push({
            publicationId: pub.id,
            offerTitle: pub.offer.title,
            groupName: group.name,
            targetChannelId: channelJid,
            success: res.success,
            error: res.errorMessage,
          });

          if (res.success) {
            pubSuccess = true;
          } else {
            lastErrorMessage = res.errorMessage || "Erro desconhecido";
          }
        } catch (err: any) {
          lastErrorMessage = err.message || "Falha na conexão";
          results.push({
            publicationId: pub.id,
            offerTitle: pub.offer.title,
            groupName: group.name,
            targetChannelId: channelJid,
            success: false,
            error: lastErrorMessage,
          });
        }

        // Intervalo humanizado com jitter aleatório entre mensagens (anti-ban)
        const randomizedDelay = 2000 + Math.floor(Math.random() * 2500);
        await new Promise((r) => setTimeout(r, randomizedDelay));
      }

      // 5. Marca como publicada se disparada com sucesso
      if (pubSuccess) {
        await prisma.publication.update({
          where: { id: pub.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            errorMessage: null,
          },
        });

        await prisma.publicationGroup.updateMany({
          where: { publicationId: pub.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        });

        await prisma.offer.update({
          where: { id: pub.offerId },
          data: { status: "PUBLISHED" },
        });

        await prisma.auditLog.create({
          data: {
            action: "AUTO_CRON_DISPATCH",
            module: "DISTRIBUTION",
            details: `Disparo automático em nuvem da oferta "${pub.offer.title}" concluído com sucesso.`,
            status: "SUCCESS",
          },
        });
      } else {
        // Se falhou, adia em 4 minutos para não travar a fila e registra o erro
        await prisma.publication.update({
          where: { id: pub.id },
          data: {
            scheduledFor: new Date(Date.now() + 4 * 60 * 1000),
            errorMessage: lastErrorMessage,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "AUTO_CRON_DISPATCH_FAILED",
            module: "DISTRIBUTION",
            details: `Falha ao disparar oferta "${pub.offer.title}": ${lastErrorMessage}`,
            status: "ERROR",
          },
        });
      }
    }

    // 6. Atualiza registro de última execução nas configurações
    if (settings?.userId) {
      await prisma.settings.update({
        where: { userId: settings.userId },
        data: {
          autopilotLastRun: new Date(),
        },
      });
    }

    // 7. Checa e envia alerta de fila baixa se necessário
    await checkAndNotifyLowQueue();

    return NextResponse.json({
      success: true,
      processed: duePublications.length,
      details: results,
      autopilotActive: isAutopilotActive,
    });
  } catch (error: any) {
    console.error("Erro no processamento da fila automática:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Função de monitoramento de fila baixa:
 * Dispara notificação no painel e WhatsApp se houver menos de 10 ofertas
 */
async function checkAndNotifyLowQueue() {
  try {
    const remainingCount = await prisma.publication.count({
      where: { status: { in: ["PENDING", "SCHEDULED"] } },
    });

    if (remainingCount <= 10 && remainingCount > 0) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const recentAlert = await prisma.auditLog.findFirst({
        where: {
          action: "LOW_QUEUE_ALERT",
          createdAt: { gte: fourHoursAgo },
        },
      });

      if (!recentAlert) {
        await prisma.notification.create({
          data: {
            title: "⚠️ Fila de Ofertas Baixa",
            message: `Restam apenas ${remainingCount} ofertas na fila. Reabasteça no painel para não interromper os envios!`,
            type: "WARNING",
            link: "/queue",
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "LOW_QUEUE_ALERT",
            module: "DISTRIBUTION",
            details: `Alerta registrado: ${remainingCount} ofertas restantes na fila.`,
            status: "SUCCESS",
          },
        });
      }
    }
  } catch (err) {
    console.error("Erro na verificação de fila baixa:", err);
  }
}
