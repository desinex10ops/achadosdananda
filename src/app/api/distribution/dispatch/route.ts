import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDistributionAdapter } from "@/modules/distribution/adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicationId, platform = "EVOLUTION" } = body;

    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        offer: {
          include: { product: true, marketplace: true },
        },
        publicationGroups: {
          include: { group: true },
        },
      },
    });

    if (!publication) {
      return NextResponse.json({ success: false, error: "Publicação não encontrada." }, { status: 404 });
    }

    // 1. Determina o JID do canal de destino e a instância
    const firstGroup = publication.publicationGroups[0]?.group;
    let targetChannelId = firstGroup?.whatsappJid || body.targetChannelId || "";
    let instanceName = firstGroup?.instanceName || body.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";

    if (!targetChannelId) {
      // Busca grupo ativo com JID cadastrado
      const groupWithJid = await prisma.group.findFirst({
        where: { whatsappJid: { not: null } },
      });
      if (groupWithJid?.whatsappJid) {
        targetChannelId = groupWithJid.whatsappJid;
      }
    }

    if (!targetChannelId && platform === "EVOLUTION") {
      return NextResponse.json({
        success: false,
        error: "Grupo do WhatsApp não possui JID cadastrado (ex: 120363429708443665@g.us).",
      }, { status: 400 });
    }

    // 2. Executa disparo via Adapter
    const adapter = getDistributionAdapter(platform as any);
    const result = await adapter.distribute({
      messageText: publication.generatedText,
      imageUrl: publication.offer.product.imageUrl,
      targetChannelId,
      instanceName,
      platform: platform as any,
    });

    // 3. Se sucesso, atualiza o status de publicação no banco
    if (result.success) {
      await prisma.publication.update({
        where: { id: publication.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await prisma.publicationGroup.updateMany({
        where: { publicationId: publication.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await prisma.offer.update({
        where: { id: publication.offerId },
        data: { status: "PUBLISHED" },
      });
    }

    // 4. Grava no AuditLog
    await prisma.auditLog.create({
      data: {
        action: "DISPATCH_OFFER",
        module: "DISTRIBUTION",
        details: `Disparo direto da oferta ${publication.offer.title} via ${platform} para ${targetChannelId}. Sucesso: ${result.success}`,
        status: result.success ? "SUCCESS" : "ERROR",
      },
    });

    return NextResponse.json({ success: result.success, data: result, error: result.errorMessage });
  } catch (error: any) {
    console.error("Erro na distribuição:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
