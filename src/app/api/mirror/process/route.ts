import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MirrorEngine } from "@/modules/mirror/engine";
import { EvolutionDistributionAdapter } from "@/modules/distribution/adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceGroupName, originalText, imageUrl, executeSend = false } = body;

    if (!originalText) {
      return NextResponse.json({ success: false, error: "Texto original não fornecido." }, { status: 400 });
    }

    // 1. Processa a mensagem no modo CLONE: substitui todos os links pelos links de afiliada da Nanda
    const { clonedText, replacedLinks } = MirrorEngine.cloneMessage(originalText);

    // 2. Busca regras ativas para esse grupo de origem
    let matchingRules: any[] = [];
    try {
      const allActiveRules = await prisma.groupMirrorRule.findMany({
        where: { isActive: true },
      });

      if (sourceGroupName) {
        const cleanSrc = sourceGroupName.toLowerCase();
        matchingRules = allActiveRules.filter((r) => {
          const ruleSrc = r.sourceGroupName.toLowerCase();
          return cleanSrc.includes(ruleSrc) || ruleSrc.includes(cleanSrc);
        });
      } else {
        matchingRules = allActiveRules;
      }
    } catch (e) {
      console.warn("Erro ao buscar regras de espelhamento:", e);
    }

    // Se nenhuma regra bater pelo nome exato, pega a primeira regra ativa como fallback
    if (matchingRules.length === 0) {
      try {
        const fallbackRule = await prisma.groupMirrorRule.findFirst({
          where: { isActive: true },
        });
        if (fallbackRule) matchingRules = [fallbackRule];
      } catch (e) {}
    }

    const createdPublications: any[] = [];
    const dispatchResults: any[] = [];

    // 3. Para cada regra correspondente, salva na fila e prepara disparo
    for (const rule of matchingRules) {
      try {
        const targetGroup = rule.targetGroupId
          ? await prisma.group.findUnique({ where: { id: rule.targetGroupId } })
          : await prisma.group.findFirst({ where: { name: { contains: rule.targetGroupName } } });

        if (!targetGroup) continue;

        // Identifica marketplace do link
        const firstLink = replacedLinks[0]?.affiliateUrl || replacedLinks[0]?.originalUrl || "";
        let marketplace = null;
        if (firstLink.includes("mercadolivre") || firstLink.includes("meli.la")) {
          marketplace = await prisma.marketplace.findUnique({ where: { slug: "mercado-livre" } });
        } else if (firstLink.includes("shopee") || firstLink.includes("shope.ee")) {
          marketplace = await prisma.marketplace.findUnique({ where: { slug: "shopee" } });
        } else if (firstLink.includes("amazon") || firstLink.includes("amzn.to")) {
          marketplace = await prisma.marketplace.findUnique({ where: { slug: "amazon" } });
        } else if (firstLink.includes("magazineluiza") || firstLink.includes("magalu")) {
          marketplace = await prisma.marketplace.findUnique({ where: { slug: "magalu" } });
        }
        if (!marketplace) {
          marketplace = (await prisma.marketplace.findFirst())!;
        }

        // Extrai título simples da primeira linha
        const firstLine = originalText.split(/\r?\n/).find((l: string) => l.trim().length > 3) || "Oferta Espelhada";
        const cleanTitle = firstLine.replace(/[*_~`]/g, "").trim().slice(0, 100);

        // Cria o Produto
        const product = await prisma.product.create({
          data: {
            marketplaceId: marketplace.id,
            name: cleanTitle,
            description: clonedText,
            category: "Moda & Beleza",
            originalPrice: 99.9,
            currentPrice: 69.9,
            imageUrl: imageUrl || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
            originalUrl: replacedLinks[0]?.originalUrl || "",
            affiliateUrl: replacedLinks[0]?.affiliateUrl || "",
          },
        });

        // Cria a Oferta
        const offer = await prisma.offer.create({
          data: {
            productId: product.id,
            marketplaceId: marketplace.id,
            title: cleanTitle,
            callout: "Oferta Espelhada VIP",
            originalPrice: 99.9,
            currentPrice: 69.9,
            discountPercentage: 30,
            savedAmount: 30.0,
            originalUrl: replacedLinks[0]?.originalUrl || "",
            affiliateUrl: replacedLinks[0]?.affiliateUrl || "",
            status: "QUEUED",
            priority: 2,
          },
        });

        const template =
          (await prisma.template.findFirst({ where: { isDefault: true } })) ||
          (await prisma.template.findFirst());
        if (!template) {
          throw new Error("Nenhum template cadastrado no sistema.");
        }

        const lastPub = await prisma.publication.findFirst({
          orderBy: { orderIndex: "desc" },
        });
        const orderIndex = (lastPub?.orderIndex ?? -1) + 1;

        // Cria a Publicação
        const publication = await prisma.publication.create({
          data: {
            offerId: offer.id,
            templateId: template.id,
            status: "PENDING",
            orderIndex,
            generatedText: clonedText,
            publicationGroups: {
              create: [
                {
                  groupId: targetGroup.id,
                  status: "PENDING",
                },
              ],
            },
          },
          include: {
            publicationGroups: { include: { group: true } },
          },
        });

        createdPublications.push(publication);

        // Se executeSend for solicitado E o grupo tiver whatsappJid configurado
        if (executeSend && targetGroup.whatsappJid) {
          try {
            const adapter = new EvolutionDistributionAdapter();
            const dispatchRes = await adapter.distribute({
              platform: "EVOLUTION",
              targetChannelId: targetGroup.whatsappJid,
              messageText: clonedText,
              imageUrl: imageUrl || undefined,
              instanceName: targetGroup.instanceName || "nanda-principal",
            });

            dispatchResults.push({
              targetGroup: targetGroup.name,
              success: dispatchRes.success,
              error: dispatchRes.errorMessage,
            });

            if (dispatchRes.success) {
              await prisma.publication.update({
                where: { id: publication.id },
                data: {
                  status: "PUBLISHED",
                  publishedAt: new Date(),
                },
              });
            }
          } catch (dispatchErr: any) {
            console.warn("Disparo direto falhou, mantendo pendente na fila:", dispatchErr.message);
          }
        }
      } catch (ruleErr) {
        console.error("Erro ao processar regra de espelhamento:", ruleErr);
      }
    }

    // Cria notificação no painel
    try {
      await prisma.notification.create({
        data: {
          title: "⚡ Mensagem Espelhada com Sucesso!",
          message: `Oferta do grupo "${sourceGroupName || 'Promo de Rica'}" clonada com seus links de afiliada e salva para o grupo "${matchingRules[0]?.targetGroupName || 'PROMO MODA & BELEZA #4'}".`,
          type: "SUCCESS",
          link: "/queue",
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      originalText,
      clonedText,
      replacedLinksCount: replacedLinks.length,
      replacedLinks,
      matchingRulesCount: matchingRules.length,
      matchingRules,
      createdPublicationsCount: createdPublications.length,
      createdPublications,
      dispatchResults,
    });
  } catch (err: any) {
    console.error("Erro na rota /api/mirror/process:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
