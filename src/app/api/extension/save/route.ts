import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDiscount } from "@/lib/utils";
import { generateOfferMessage } from "@/modules/templates/engine";
import { evaluateAutomationRules } from "@/modules/automation/engine";

async function saveOneOffer(item: any, defaultTemplate: any, defaultGroups: any[]) {
  const title = item.title || item.name || item.produto || "Produto Sem Nome";
  const rawOrig = item.originalPrice || item.precoOriginal || item.regularPrice || 0;
  const rawCurr = item.currentPrice || item.precoAtual || item.price || 0;
  const origPrice = parseFloat(String(rawOrig)) || parseFloat(String(rawCurr)) || 0;
  const currPrice = parseFloat(String(rawCurr)) || origPrice;

  const { discountPercentage, savedAmount } = calculateDiscount(origPrice, currPrice);

  const imageUrl = item.imageUrl || item.image || item.imagem || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";
  const originalUrl = item.url || item.link || item.originalUrl || "";
  const affiliateUrl = item.affiliateUrl || originalUrl;
  const couponCode = item.coupon || item.cupom || item.couponCode || null;
  const shippingInfo = item.shippingInfo || item.frete || "Frete Grátis";
  const marketplaceSlug = (item.marketplace || item.plataforma || "").toLowerCase();

  // Identificar marketplace
  let marketplace = await prisma.marketplace.findFirst({
    where: {
      OR: [
        { slug: { contains: marketplaceSlug } },
        { name: { contains: marketplaceSlug } },
      ],
    },
  });

  if (!marketplace) {
    if (originalUrl.includes("mercadolivre") || originalUrl.includes("mercadolibre")) {
      marketplace = await prisma.marketplace.findUnique({ where: { slug: "mercado-livre" } });
    } else if (originalUrl.includes("shopee")) {
      marketplace = await prisma.marketplace.findUnique({ where: { slug: "shopee" } });
    } else if (originalUrl.includes("amazon")) {
      marketplace = await prisma.marketplace.findUnique({ where: { slug: "amazon" } });
    } else if (originalUrl.includes("magazineluiza") || originalUrl.includes("magazinevoce")) {
      marketplace = await prisma.marketplace.findUnique({ where: { slug: "magalu" } });
    }
  }

  if (!marketplace) {
    marketplace = (await prisma.marketplace.findFirst())!;
  }

  // Criar ou atualizar Produto
  const product = await prisma.product.create({
    data: {
      marketplaceId: marketplace.id,
      name: title,
      description: item.description || null,
      category: item.category || "Geral",
      subcategory: item.subcategory || null,
      brand: item.brand || null,
      originalPrice: origPrice,
      currentPrice: currPrice,
      imageUrl,
      originalUrl,
      affiliateUrl,
    },
  });

  const action = item.action || "QUEUE"; // QUEUE, RADAR, PUBLISH_NOW
  const initialStatus = action === "RADAR" ? "RADAR" : "QUEUED";

  // Criar Oferta
  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      marketplaceId: marketplace.id,
      title,
      callout: item.callout || "Achado exclusivo!",
      originalPrice: origPrice,
      currentPrice: currPrice,
      discountPercentage,
      savedAmount,
      couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
      shippingInfo,
      originalUrl,
      affiliateUrl,
      status: initialStatus,
      priority: item.priority || 1,
    },
    include: {
      marketplace: true,
      product: true,
    },
  });

  // Se for para adicionar à fila
  let publication = null;
  if (action === "QUEUE" || action === "PUBLISH_NOW") {
    let template = item.templateId
      ? await prisma.template.findUnique({ where: { id: item.templateId } })
      : defaultTemplate;

    const groups = item.groupIds && item.groupIds.length > 0
      ? await prisma.group.findMany({ where: { id: { in: item.groupIds } } })
      : defaultGroups;

    if (template) {
      const generatedMessage = generateOfferMessage(
        {
          title: offer.title,
          callout: offer.callout,
          originalPrice: offer.originalPrice,
          currentPrice: offer.currentPrice,
          discountPercentage: offer.discountPercentage,
          savedAmount: offer.savedAmount,
          couponCode: offer.couponCode,
          shippingInfo: offer.shippingInfo,
          affiliateUrl: offer.affiliateUrl,
          originalUrl: offer.originalUrl,
        },
        template
      );

      const lastPub = await prisma.publication.findFirst({
        orderBy: { orderIndex: "desc" },
      });
      const orderIndex = (lastPub?.orderIndex ?? -1) + 1;

      publication = await prisma.publication.create({
        data: {
          offerId: offer.id,
          templateId: template.id,
          status: action === "PUBLISH_NOW" ? "PUBLISHED" : "PENDING",
          publishedAt: action === "PUBLISH_NOW" ? new Date() : null,
          orderIndex,
          generatedText: generatedMessage,
          publicationGroups: {
            create: groups.map((g: any) => ({
              groupId: g.id,
              status: "PENDING",
            })),
          },
        },
        include: {
          publicationGroups: { include: { group: true } },
        },
      });
    }
  }

  // Avaliar regras de automação
  try {
    await evaluateAutomationRules({
      id: offer.id,
      title: offer.title,
      category: product.category,
      discountPercentage: offer.discountPercentage,
      hasCoupon: !!offer.couponCode,
      currentPrice: offer.currentPrice,
      originalPrice: offer.originalPrice,
    });
  } catch (err) {
    // Silencia se regras opcionais não estiverem configuradas
  }

  return { offer, publication };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Carregar template e grupos padrão
    const defaultTemplate = await prisma.template.findFirst({ where: { isDefault: true } }) || await prisma.template.findFirst();
    const defaultGroups = await prisma.group.findMany({ where: { isActive: true }, take: 1 });

    // Suporte a lote (Batch)
    const items = Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : null);

    if (items && items.length > 0) {
      const results = [];
      for (const item of items) {
        try {
          const itemPayload = {
            ...item,
            action: body.action || item.action || "QUEUE",
            templateId: body.templateId || item.templateId,
            groupIds: body.groupIds || item.groupIds,
          };
          const saved = await saveOneOffer(itemPayload, defaultTemplate, defaultGroups);
          results.push(saved);
        } catch (itemErr) {
          console.error("Erro ao salvar item do lote:", itemErr);
        }
      }

      await prisma.notification.create({
        data: {
          title: "⚡ Lote de Ofertas Capturado!",
          message: `${results.length} ofertas foram capturadas e salvas com sucesso no sistema.`,
          type: "SUCCESS",
          link: body.action === "RADAR" ? "/radar" : "/queue",
        },
      });

      return NextResponse.json({
        success: true,
        count: results.length,
        data: results,
      }, { status: 201 });
    }

    // Suporte a Item Único
    const saved = await saveOneOffer(body, defaultTemplate, defaultGroups);

    await prisma.notification.create({
      data: {
        title: "⚡ Oferta Capturada pela Extensão!",
        message: `${saved.offer.title} adicionada via extensão.`,
        type: "SUCCESS",
        link: body.action === "RADAR" ? "/radar" : "/queue",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: saved,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro na extensão:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
