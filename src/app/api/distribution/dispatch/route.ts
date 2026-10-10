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

    // 1. Determina todos os grupos de destino vinculados à publicação
    let targetGroups = publication.publicationGroups
      .map((pg) => pg.group)
      .filter((g) => g && g.whatsappJid && g.isActive);

    if (body.targetChannelId) {
      targetGroups = [
        {
          id: "custom",
          name: "Canal Personalizado",
          whatsappJid: body.targetChannelId,
          instanceName: body.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal",
        } as any,
      ];
    } else if (targetGroups.length === 0) {
      const defaultGroup =
        (await prisma.group.findFirst({
          where: { name: { contains: "4" }, whatsappJid: { not: null }, isActive: true },
        })) ||
        (await prisma.group.findFirst({
          where: { whatsappJid: { not: null }, isActive: true },
          orderBy: { priority: "asc" },
        }));
      targetGroups = defaultGroup ? ([defaultGroup] as any) : [];
    }

    // Deduplicação estrita de JIDs
    const seenJids = new Set<string>();
    targetGroups = targetGroups.filter((g) => {
      if (!g.whatsappJid || seenJids.has(g.whatsappJid)) return false;
      seenJids.add(g.whatsappJid);
      return true;
    });

    if (targetGroups.length === 0 && platform === "EVOLUTION") {
      return NextResponse.json({
        success: false,
        error: "Nenhum grupo do WhatsApp com JID cadastrado foi encontrado.",
      }, { status: 400 });
    }

    // Prepara texto higienizado com link direto de afiliada oficial
    let cleanMessage = publication.generatedText
      .replace(/Oferta exclusiva encontrada no grupo[^\n]*\n*/gi, "")
      .replace(/encontrad[ao] no grupo[^\n]*\n*/gi, "")
      .replace(/Promo de Rica[^\n]*\n*/gi, "")
      .replace(/Participe do nosso grupo[^\n]*\n*/gi, "")
      .replace(/Entre no nosso grupo[^\n]*\n*/gi, "")
      .trim();

    const directAffiliate = publication.offer.affiliateUrl || publication.offer.originalUrl;
    if (directAffiliate) {
      cleanMessage = cleanMessage
        .replace(/https?:\/\/[^\s]*\/r\/[^\s]+/gi, directAffiliate)
        .replace(/https?:\/\/localhost[^\s]*/gi, directAffiliate);

      if (!cleanMessage.includes(directAffiliate)) {
        cleanMessage = cleanMessage.replace(/https?:\/\/[^\s]+/gi, (matchedUrl) => {
          if (matchedUrl.includes("unsplash.com") || matchedUrl.includes(".jpg") || matchedUrl.includes(".png")) {
            return matchedUrl;
          }
          return directAffiliate;
        });
      }
    }

    // 2. Executa disparo via Adapter para cada grupo
    const adapter = getDistributionAdapter(platform as any);
    const dispatchResults: any[] = [];
    let atLeastOneSuccess = false;

    for (const group of targetGroups) {
      const channelJid = group.whatsappJid!;
      const instance = group.instanceName || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";

      const res = await adapter.distribute({
        messageText: cleanMessage,
        imageUrl: publication.offer.product.imageUrl,
        targetChannelId: channelJid,
        instanceName: instance,
        platform: platform as any,
      });

      dispatchResults.push({
        groupName: group.name,
        targetChannelId: channelJid,
        success: res.success,
        error: res.errorMessage,
      });

      if (res.success) {
        atLeastOneSuccess = true;
      }

      // Pequena pausa amigável entre envios para evitar rate limit
      if (targetGroups.length > 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    // 3. Se pelo menos um grupo teve sucesso, atualiza o status de publicação no banco
    if (atLeastOneSuccess) {
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
    const groupNames = targetGroups.map((g) => g.name).join(", ");
    await prisma.auditLog.create({
      data: {
        action: "DISPATCH_OFFER",
        module: "DISTRIBUTION",
        details: `Disparo da oferta ${publication.offer.title} via ${platform} para [${groupNames}]. Sucesso: ${atLeastOneSuccess}`,
        status: atLeastOneSuccess ? "SUCCESS" : "ERROR",
      },
    });

    return NextResponse.json({
      success: atLeastOneSuccess,
      results: dispatchResults,
      data: dispatchResults[0],
    });
  } catch (error: any) {
    console.error("Erro na distribuição:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
