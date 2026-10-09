import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ShopeeProductItem } from "@/modules/marketplaces/shopee";
import { generateOfferMessage } from "@/modules/templates/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { products, sendToQueue = true } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum produto foi fornecido para salvar." },
        { status: 400 }
      );
    }

    // 1. Garantir existência do Marketplace Shopee
    let marketplace = await prisma.marketplace.findUnique({
      where: { slug: "shopee" },
    });

    if (!marketplace) {
      marketplace = await prisma.marketplace.create({
        data: {
          name: "Shopee",
          slug: "shopee",
          badgeColor: "orange",
          isActive: true,
          commissionRate: 5.0,
        },
      });
    }

    // 2. Buscar Template padrão ou primeiro ativo
    let template = await prisma.template.findFirst({
      where: { isDefault: true },
    });
    if (!template) {
      template = await prisma.template.findFirst();
    }
    if (!template) {
      template = await prisma.template.create({
        data: {
          name: "Oferta Relâmpago Padrão",
          type: "OFERTA_RELAMPAGO",
          header: "🔥 SUPER OFERTA ENCONTRADA!",
          structure: "🔥 *{TITULO}*\n\nDe: ~{PRECO_DE}~\nPor apenas: *{PRECO_POR}*\nEconomize: {ECONOMIA} ({DESCONTO})\n\n{CTA}\n👉 {LINK}",
          cta: "👇 COMPRE PELO LINK ABAIXO:",
          isDefault: true,
        },
      });
    }

    const savedOffers = [];
    let addedToQueueCount = 0;

    // Obter último orderIndex da fila
    const lastPub = await prisma.publication.findFirst({
      orderBy: { orderIndex: "desc" },
    });
    let currentOrderIndex = (lastPub?.orderIndex ?? -1) + 1;

    for (const item of products as ShopeeProductItem[]) {
      // 3. Upsert do Produto
      const originalPrice = Number(item.originalPrice) || Number(item.currentPrice);
      const currentPrice = Number(item.currentPrice);
      const discountPercentage = item.discountPercentage || Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      const savedAmount = Math.max(0, originalPrice - currentPrice);

      let product = await prisma.product.findFirst({
        where: {
          marketplaceId: marketplace.id,
          originalUrl: item.originalUrl,
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            marketplaceId: marketplace.id,
            name: item.title,
            originalPrice,
            currentPrice,
            imageUrl: item.imageUrl,
            originalUrl: item.originalUrl,
            affiliateUrl: item.affiliateUrl || item.originalUrl,
            category: item.category || "Geral",
          },
        });
      } else {
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            currentPrice,
            originalPrice,
            imageUrl: item.imageUrl,
            affiliateUrl: item.affiliateUrl || product.affiliateUrl,
          },
        });
      }

      // 4. Criar ou atualizar Oferta
      let offer = await prisma.offer.findFirst({
        where: {
          productId: product.id,
          marketplaceId: marketplace.id,
        },
      });

      if (!offer) {
        offer = await prisma.offer.create({
          data: {
            productId: product.id,
            marketplaceId: marketplace.id,
            title: item.title,
            originalPrice,
            currentPrice,
            discountPercentage,
            savedAmount,
            originalUrl: item.originalUrl,
            affiliateUrl: item.affiliateUrl || item.originalUrl,
            shippingInfo: "Frete Grátis com Cupom",
            status: "QUEUED",
          },
        });
      } else {
        offer = await prisma.offer.update({
          where: { id: offer.id },
          data: {
            currentPrice,
            originalPrice,
            discountPercentage,
            savedAmount,
            status: "QUEUED",
          },
        });
      }

      savedOffers.push(offer);

      // 5. Se sendToQueue=true, adiciona à fila de publicações
      if (sendToQueue) {
        const existingPub = await prisma.publication.findFirst({
          where: {
            offerId: offer.id,
            status: { in: ["PENDING", "SCHEDULED"] },
          },
        });

        if (!existingPub) {
          const generatedText = generateOfferMessage(
            {
              title: offer.title,
              originalPrice: offer.originalPrice,
              currentPrice: offer.currentPrice,
              discountPercentage: offer.discountPercentage,
              savedAmount: offer.savedAmount,
              shippingInfo: offer.shippingInfo,
              affiliateUrl: offer.affiliateUrl,
              marketplaceName: "Shopee",
            },
            template
          );

          await prisma.publication.create({
            data: {
              offerId: offer.id,
              templateId: template.id,
              status: "PENDING",
              orderIndex: currentOrderIndex++,
              generatedText,
            },
          });
          addedToQueueCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${savedOffers.length} produto(s) salvos e ${addedToQueueCount} adicionados à fila de disparo!`,
      savedCount: savedOffers.length,
      queueCount: addedToQueueCount,
    });
  } catch (err: any) {
    console.error("Erro ao salvar produtos em lote da Shopee:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
