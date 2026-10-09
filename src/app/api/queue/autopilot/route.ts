import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDistributionAdapter } from "@/modules/distribution/adapter";

export const dynamic = "force-dynamic";

/**
 * GET: Obtém o status atual do Piloto Automático (persistido no banco de dados)
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    const isActive = settings?.autopilotActive ?? false;
    const intervalMinutes = settings?.autopilotInterval ?? 8;
    const lastRun = settings?.autopilotLastRun ?? null;

    // Busca próximo item pendente/agendado na fila
    const nextItem = await prisma.publication.findFirst({
      where: {
        status: { in: ["SCHEDULED", "PENDING"] },
      },
      orderBy: [
        { scheduledFor: "asc" },
        { orderIndex: "asc" },
        { createdAt: "asc" },
      ],
      include: {
        offer: {
          include: { product: true, marketplace: true },
        },
      },
    });

    const pendingCount = await prisma.publication.count({
      where: {
        status: { in: ["SCHEDULED", "PENDING"] },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isActive,
        intervalMinutes,
        lastRun,
        nextItem: nextItem
          ? {
              id: nextItem.id,
              title: nextItem.offer.title,
              scheduledFor: nextItem.scheduledFor,
              status: nextItem.status,
            }
          : null,
        nextScheduledTime: nextItem?.scheduledFor || null,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error("Erro ao obter status do piloto automático:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Inicia ou pausa o Piloto Automático na nuvem e sincroniza a agenda de toda a fila
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, intervalMinutes = 8, sendFirstImmediately = true } = body;

    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (action === "START") {
      // 1. Atualiza configuração no banco para persistir
      await prisma.settings.upsert({
        where: { userId: user.id },
        update: {
          autopilotActive: true,
          autopilotInterval: intervalMinutes,
          autopilotLastRun: new Date(),
        },
        create: {
          userId: user.id,
          autopilotActive: true,
          autopilotInterval: intervalMinutes,
          autopilotLastRun: new Date(),
        },
      });

      // 2. Busca todas as publicações pendentes ou agendadas para recalcular a grade de envio
      const pendingItems = await prisma.publication.findMany({
        where: {
          status: { in: ["PENDING", "SCHEDULED"] },
        },
        orderBy: [
          { orderIndex: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          offer: {
            include: { product: true, marketplace: true },
          },
          publicationGroups: {
            include: { group: true },
          },
        },
      });

      if (pendingItems.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Piloto automático ativado, mas não há ofertas pendentes na fila.",
          dispatchedFirst: false,
        });
      }

      let dispatchedFirst = false;
      const now = new Date();
      let scheduledCursor = new Date(now);

      // Se solicitado, dispara o 1º item imediatamente
      if (sendFirstImmediately && pendingItems.length > 0) {
        const firstItem = pendingItems[0];
        try {
          const adapter = getDistributionAdapter("EVOLUTION");

          let targetGroups = firstItem.publicationGroups
            .map((pg) => pg.group)
            .filter((g) => g && g.whatsappJid && g.isActive);

          if (targetGroups.length === 0) {
            const activeGroups = await prisma.group.findMany({
              where: { whatsappJid: { not: null }, isActive: true },
            });
            targetGroups = activeGroups as any;
          }

          let anySuccess = false;
          for (const group of targetGroups) {
            const channelJid = group.whatsappJid!;
            const instance = group.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";

            const res = await adapter.distribute({
              messageText: firstItem.generatedText,
              imageUrl: firstItem.offer.product.imageUrl,
              targetChannelId: channelJid,
              instanceName: instance,
              platform: "EVOLUTION",
            });

            if (res.success) {
              anySuccess = true;
            }
          }

          if (anySuccess) {
            await prisma.publication.update({
              where: { id: firstItem.id },
              data: {
                status: "PUBLISHED",
                publishedAt: new Date(),
              },
            });

            await prisma.publicationGroup.updateMany({
              where: { publicationId: firstItem.id },
              data: {
                status: "PUBLISHED",
                publishedAt: new Date(),
              },
            });

            await prisma.offer.update({
              where: { id: firstItem.offerId },
              data: { status: "PUBLISHED" },
            });

            dispatchedFirst = true;
          }
        } catch (dispatchErr) {
          console.error("Erro ao disparar primeira oferta imediatamente:", dispatchErr);
        }
      }

      // 3. Reagenda todas as ofertas restantes para o futuro a cada X minutos na nuvem (com variação humanizada)
      const remainingItems = dispatchedFirst ? pendingItems.slice(1) : pendingItems;

      let accumulatedMinutes = 0;
      for (let i = 0; i < remainingItems.length; i++) {
        const item = remainingItems[i];
        // Humanização: adiciona jitter de -1 a +2 minutos para evitar padrão robótico
        const jitter = Math.floor(Math.random() * 4) - 1; 
        const stepMinutes = Math.max(3, intervalMinutes + jitter);
        accumulatedMinutes += stepMinutes;
        const nextTime = new Date(scheduledCursor.getTime() + accumulatedMinutes * 60 * 1000);

        await prisma.publication.update({
          where: { id: item.id },
          data: {
            status: "SCHEDULED",
            scheduledFor: nextTime,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Piloto automático ativado com sucesso! ${remainingItems.length} ofertas agendadas para disparo automático 24/7 na nuvem a cada ${intervalMinutes} minutos.`,
        dispatchedFirst,
        totalScheduled: remainingItems.length,
      });
    }

    if (action === "PAUSE") {
      await prisma.settings.upsert({
        where: { userId: user.id },
        update: {
          autopilotActive: false,
        },
        create: {
          userId: user.id,
          autopilotActive: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Piloto automático pausado com sucesso.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar piloto automático:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
