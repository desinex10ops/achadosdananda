import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDistributionAdapter } from "@/modules/distribution/adapter";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Cron Job na Nuvem:
 * Processa a fila de ofertas agendadas que já chegaram no horário e faz o disparo
 * 100% automático no WhatsApp (Grupo 4 e Grupo 5), mesmo com o computador desligado.
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

    // 1. Busca ofertas agendadas cujo horário já chegou
    const duePublications = await prisma.publication.findMany({
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
      take: 5, // Processa até 5 ofertas por ciclo para manter envio humanizado
    });

    if (duePublications.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma oferta com horário pendente para este minuto.",
        processed: 0,
      });
    }

    const adapter = getDistributionAdapter("EVOLUTION");
    const results: any[] = [];

    for (const pub of duePublications) {
      // 2. Busca grupos vinculados ativos
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

      for (const group of targetGroups) {
        const channelJid = group.whatsappJid!;
        const instance = group.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";

        const res = await adapter.distribute({
          messageText: pub.generatedText,
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
        }

        // Intervalo de segurança anti-ban do WhatsApp entre mensagens
        await new Promise((r) => setTimeout(r, 2000));
      }

      // 3. Marca como publicada se disparada
      if (pubSuccess) {
        await prisma.publication.update({
          where: { id: pub.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
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
            details: `Disparo automático em nuvem da oferta ${pub.offer.title} concluído com sucesso.`,
            status: "SUCCESS",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: duePublications.length,
      details: results,
    });
  } catch (error: any) {
    console.error("Erro no processamento da fila automática:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
