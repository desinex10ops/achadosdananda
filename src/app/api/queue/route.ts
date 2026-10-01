import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const publications = await prisma.publication.findMany({
      where,
      include: {
        offer: {
          include: {
            product: true,
            marketplace: true,
          },
        },
        template: true,
        publicationGroups: {
          include: {
            group: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { orderIndex: "asc" },
        { scheduledFor: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ success: true, data: publications });
  } catch (error: any) {
    console.error("Erro ao listar fila:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar fila de publicações." },
      { status: 500 }
    );
  }
}

// Reordenar ou adicionar à fila
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, publicationId, newOrderIndex, offerId, templateId, groupIds, scheduledFor } = body;

    // Ação: Reordenar itens
    if (action === "REORDER" && Array.isArray(body.items)) {
      // items = [{ id: 'pub-id', orderIndex: 0 }, { id: 'pub-id2', orderIndex: 1 }]
      for (const item of body.items) {
        await prisma.publication.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        });
      }
      return NextResponse.json({ success: true, message: "Fila reordenada com sucesso." });
    }

    // Ação: Adicionar oferta existente à fila
    if (offerId && templateId) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { marketplace: true, product: true },
      });

      if (!offer) {
        return NextResponse.json({ success: false, error: "Oferta não encontrada." }, { status: 404 });
      }

      const template = await prisma.template.findUnique({ where: { id: templateId } });
      if (!template) {
        return NextResponse.json({ success: false, error: "Template não encontrado." }, { status: 404 });
      }

      const lastPub = await prisma.publication.findFirst({
        orderBy: { orderIndex: "desc" },
      });
      const orderIndex = (lastPub?.orderIndex ?? -1) + 1;

      const pub = await prisma.publication.create({
        data: {
          offerId,
          templateId,
          status: scheduledFor ? "SCHEDULED" : "PENDING",
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          orderIndex,
          generatedText: template.structure
            .replace(/{TITULO}/g, offer.title)
            .replace(/{PRECO_POR}/g, `R$ ${offer.currentPrice.toFixed(2)}`)
            .replace(/{LINK}/g, offer.affiliateUrl),
          publicationGroups: {
            create: (groupIds || []).map((gid: string) => ({
              groupId: gid,
              status: "PENDING",
            })),
          },
        },
      });

      await prisma.offer.update({
        where: { id: offerId },
        data: { status: scheduledFor ? "SCHEDULED" : "QUEUED" },
      });

      return NextResponse.json({ success: true, data: pub }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na fila:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Excluir múltiplos itens da fila em lote
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json().catch(() => ({}));
    const ids: string[] = body.ids || (id ? [id] : []);

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum ID informado para exclusão." },
        { status: 400 }
      );
    }

    // 1. Remove publicações dos grupos associados primeiro
    await prisma.publicationGroup.deleteMany({
      where: { publicationId: { in: ids } },
    });

    // 2. Remove as publicações da fila
    const result = await prisma.publication.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} oferta(s) removida(s) da fila.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Erro ao deletar da fila:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

