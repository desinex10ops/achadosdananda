import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDiscount } from "@/lib/utils";
import { generateOfferMessage } from "@/modules/templates/engine";
import { evaluateAutomationRules } from "@/modules/automation/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = body.title || body.name || body.produto || "Produto Sem Nome";
    const rawOrig = body.originalPrice || body.precoOriginal || body.regularPrice || 0;
    const rawCurr = body.currentPrice || body.precoAtual || body.price || 0;
    const origPrice = parseFloat(String(rawOrig)) || parseFloat(String(rawCurr)) || 0;
    const currPrice = parseFloat(String(rawCurr)) || origPrice;

    const { discountPercentage, savedAmount } = calculateDiscount(origPrice, currPrice);

    const imageUrl = body.imageUrl || body.image || body.imagem || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";
    const originalUrl = body.url || body.link || body.originalUrl || "";
    const affiliateUrl = body.affiliateUrl || originalUrl;
    const couponCode = body.coupon || body.cupom || body.couponCode || null;
    const shippingInfo = body.shippingInfo || body.frete || "Frete Grátis";
    const marketplaceSlug = (body.marketplace || body.plataforma || "").toLowerCase();

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
      // Tenta inferir da URL
      if (originalUrl.includes("mercadolivre") || originalUrl.includes("mercadolibre")) {
        marketplace = await prisma.marketplace.findUnique({ where: { slug: "mercado-livre" } });
      } else if (originalUrl.includes("shopee")) {
        marketplace = await prisma.marketplace.findUnique({ where: { slug: "shopee" } });
      } else if (originalUrl.includes("amazon")) {
        marketplace = await prisma.marketplace.findUnique({ where: { slug: "amazon" } });
      }
    }

    if (!marketplace) {
      marketplace = (await prisma.marketplace.findFirst())!;
    }

    // Criar Produto
    const product = await prisma.product.create({
      data: {
        marketplaceId: marketplace.id,
        name: title,
        description: body.description || null,
        category: body.category || "Geral",
        subcategory: body.subcategory || null,
        brand: body.brand || null,
        originalPrice: origPrice,
        currentPrice: currPrice,
        imageUrl,
        originalUrl,
        affiliateUrl,
      },
    });

    const action = body.action || "QUEUE"; // QUEUE, RADAR, PUBLISH_NOW
    const initialStatus = action === "RADAR" ? "RADAR" : "QUEUED";

    // Criar Oferta
    const offer = await prisma.offer.create({
      data: {
        productId: product.id,
        marketplaceId: marketplace.id,
        title,
        callout: body.callout || "Achado exclusivo!",
        originalPrice: origPrice,
        currentPrice: currPrice,
        discountPercentage,
        savedAmount,
        couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
        shippingInfo,
        originalUrl,
        affiliateUrl,
        status: initialStatus,
        priority: 1,
      },
      include: {
        marketplace: true,
        product: true,
      },
    });

    // Se for para adicionar à fila
    let publication = null;
    if (action === "QUEUE" || action === "PUBLISH_NOW") {
      let template = body.templateId
        ? await prisma.template.findUnique({ where: { id: body.templateId } })
        : await prisma.template.findFirst({ where: { isDefault: true } });

      if (!template) {
        template = await prisma.template.findFirst();
      }

      const groups = body.groupIds && body.groupIds.length > 0
        ? await prisma.group.findMany({ where: { id: { in: body.groupIds } } })
        : await prisma.group.findMany({ where: { isActive: true }, take: 1 });

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
              create: groups.map((g) => ({
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
    const appliedRules = await evaluateAutomationRules({
      id: offer.id,
      title: offer.title,
      category: product.category,
      discountPercentage: offer.discountPercentage,
      hasCoupon: !!offer.couponCode,
      currentPrice: offer.currentPrice,
      originalPrice: offer.originalPrice,
    });

    // Notificação
    await prisma.notification.create({
      data: {
        title: "⚡ Oferta Capturada pela Extensão!",
        message: `${offer.title} (${offer.marketplace.name}) adicionada via extensão.`,
        type: "SUCCESS",
        link: action === "RADAR" ? "/radar" : "/queue",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          offer,
          publication,
          appliedRules,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro na extensão:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
