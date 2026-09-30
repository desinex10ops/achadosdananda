import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDiscount } from "@/lib/utils";
import { generateOfferMessage } from "@/modules/templates/engine";
import { validatePublicationRules } from "@/modules/queue/rules";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || undefined;
    const marketplaceId = searchParams.get("marketplaceId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { brand: { contains: q } } },
        { couponCode: { contains: q } },
      ];
    }
    if (status) where.status = status;
    if (marketplaceId) where.marketplaceId = marketplaceId;

    const offers = await prisma.offer.findMany({
      where,
      include: {
        product: true,
        marketplace: true,
        publications: {
          include: {
            template: true,
            publicationGroups: {
              include: { group: true },
            },
          },
        },
        _count: {
          select: { clicks: true, conversions: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: offers });
  } catch (error: any) {
    console.error("Erro ao listar ofertas:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao buscar ofertas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      // Marketplace
      marketplaceId,

      // Product fields
      productId, // se estiver reutilizando produto existente
      productName,
      productDescription,
      category = "Geral",
      subcategory,
      brand,
      imageUrl,

      // Offer prices & calculation
      originalPrice,
      currentPrice,
      couponCode,
      shippingInfo = "Frete Grátis",

      // Links
      originalUrl,
      affiliateUrl,

      // Extra
      callout,
      notes,
      priority = 1,

      // Workflow action: 'QUEUE' | 'SCHEDULE' | 'PUBLISH_NOW' | 'RADAR' | 'DRAFT'
      action = "QUEUE",
      scheduledFor,
      templateId,
      groupIds = [], // Array de IDs de grupos
      customGeneratedText, // Texto editado manualmente pelo usuário se houver
    } = body;

    if (!marketplaceId || !productName || !originalPrice || !currentPrice || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Preencha todos os campos obrigatórios (Marketplace, Nome, Preços e Imagem)." },
        { status: 400 }
      );
    }

    const origPrice = parseFloat(originalPrice);
    const currPrice = parseFloat(currentPrice);
    const { discountPercentage, savedAmount } = calculateDiscount(origPrice, currPrice);

    // 1. Criar ou vincular o produto
    let targetProductId = productId;
    if (!targetProductId) {
      const createdProduct = await prisma.product.create({
        data: {
          marketplaceId,
          name: productName,
          description: productDescription || null,
          category,
          subcategory: subcategory || null,
          brand: brand || null,
          originalPrice: origPrice,
          currentPrice: currPrice,
          imageUrl,
          originalUrl: originalUrl || "",
          affiliateUrl: affiliateUrl || originalUrl || "",
          notes,
        },
      });
      targetProductId = createdProduct.id;
    }

    // 2. Determinar status inicial da oferta
    let initialOfferStatus = "QUEUED";
    if (action === "RADAR") initialOfferStatus = "RADAR";
    else if (action === "DRAFT") initialOfferStatus = "DRAFT";
    else if (action === "SCHEDULE") initialOfferStatus = "SCHEDULED";
    else if (action === "PUBLISH_NOW") initialOfferStatus = "PUBLISHED";

    // 3. Criar a oferta
    const offer = await prisma.offer.create({
      data: {
        productId: targetProductId,
        marketplaceId,
        title: productName,
        callout: callout || null,
        originalPrice: origPrice,
        currentPrice: currPrice,
        discountPercentage,
        savedAmount,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
        shippingInfo,
        originalUrl: originalUrl || "",
        affiliateUrl: affiliateUrl || originalUrl || "",
        status: initialOfferStatus,
        notes,
        priority: Number(priority),
      },
      include: {
        marketplace: true,
        product: true,
      },
    });

    // 4. Validar regras de publicação se grupos foram selecionados
    const warnings: string[] = [];
    if (groupIds.length > 0) {
      for (const gid of groupIds) {
        const val = await validatePublicationRules(targetProductId, gid, scheduledFor ? new Date(scheduledFor) : new Date());
        if (val.warnings.length > 0) warnings.push(...val.warnings);
      }
    }

    // 5. Se foi selecionado template e a ação requer publicação ou fila
    let publication = null;
    if (templateId && (action === "QUEUE" || action === "SCHEDULE" || action === "PUBLISH_NOW")) {
      const template = await prisma.template.findUnique({ where: { id: templateId } });

      let finalMessage = customGeneratedText;
      if (!finalMessage && template) {
        finalMessage = generateOfferMessage(
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
      }

      const pubStatus = action === "PUBLISH_NOW" ? "PUBLISHED" : action === "SCHEDULE" ? "SCHEDULED" : "PENDING";
      const scheduledDate = action === "SCHEDULE" && scheduledFor ? new Date(scheduledFor) : null;
      const publishedDate = action === "PUBLISH_NOW" ? new Date() : null;

      // Obter próximo orderIndex na fila
      const lastPub = await prisma.publication.findFirst({
        orderBy: { orderIndex: "desc" },
      });
      const orderIndex = (lastPub?.orderIndex ?? -1) + 1;

      publication = await prisma.publication.create({
        data: {
          offerId: offer.id,
          templateId,
          status: pubStatus,
          scheduledFor: scheduledDate,
          publishedAt: publishedDate,
          priority: offer.priority,
          orderIndex,
          generatedText: finalMessage || "",
          publicationGroups: {
            create: groupIds.map((gid: string) => ({
              groupId: gid,
              status: pubStatus,
              publishedAt: publishedDate,
            })),
          },
        },
        include: {
          publicationGroups: {
            include: { group: true },
          },
        },
      });

      // Criar notificação interna
      await prisma.notification.create({
        data: {
          title: action === "PUBLISH_NOW" ? "Oferta Publicada!" : action === "SCHEDULE" ? "Oferta Agendada!" : "Oferta Adicionada à Fila!",
          message: `${offer.title} (${offer.marketplace.name})`,
          type: "SUCCESS",
          link: `/queue`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: { offer, publication, warnings },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar oferta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao registrar oferta." },
      { status: 500 }
    );
  }
}
