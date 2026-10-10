import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOfferMessage } from "@/modules/templates/engine";

export const dynamic = "force-dynamic";

// Catálogo curado de alta conversão para auto-reabastecimento contínuo de emergência/autônomo
const TRENDING_REFILL_DEALS = [
  {
    title: "Vestido Midi Canelado Feminino Gola Alta Moda Outono Casual",
    originalPrice: 89.90,
    currentPrice: 39.90,
    discountPercentage: 55,
    imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/vestido-midi-canelado",
    affiliateUrl: "https://shope.ee/achadosnanda-vestido-midi",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
  {
    title: "Conjunto Moletom Feminino Flanelado Casaco Capuz e Calça Jogger",
    originalPrice: 159.00,
    currentPrice: 79.90,
    discountPercentage: 50,
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/conjunto-moletom",
    affiliateUrl: "https://shope.ee/achadosnanda-conjunto-moletom",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
  {
    title: "Batom Líquido Matte Longa Duração Efeito Aveludado Nude",
    originalPrice: 45.00,
    currentPrice: 18.90,
    discountPercentage: 58,
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/batom-matte",
    affiliateUrl: "https://shope.ee/achadosnanda-batom-matte",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
  {
    title: "Kit 5 Pares Meia Cano Médio Algodão Confort Macia Unissex",
    originalPrice: 49.90,
    currentPrice: 22.90,
    discountPercentage: 54,
    imageUrl: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/kit-meias",
    affiliateUrl: "https://shope.ee/achadosnanda-kit-meias",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
  {
    title: "Organizador de Maquiagem Acrílico Giratório 360 Graus",
    originalPrice: 89.90,
    currentPrice: 44.90,
    discountPercentage: 50,
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/organizador-acrilico",
    affiliateUrl: "https://shope.ee/achadosnanda-organizador-360",
    category: "Casa & Cozinha",
    marketplace: "SHOPEE",
  },
  {
    title: "Sandália Feminina Salto Bloco Médio Confort Tiras Finas Elegante",
    originalPrice: 129.90,
    currentPrice: 59.90,
    discountPercentage: 54,
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/sandalia-salto-bloco",
    affiliateUrl: "https://shope.ee/achadosnanda-sandalia-bloco",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
  {
    title: "Garrafa Térmica Inox Inteligente Display Digital LED 500ml",
    originalPrice: 69.90,
    currentPrice: 27.90,
    discountPercentage: 60,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/garrafa-led",
    affiliateUrl: "https://shope.ee/achadosnanda-garrafa-led",
    category: "Casa & Cozinha",
    marketplace: "SHOPEE",
  },
  {
    title: "Bolsa Feminina Tiracolo Transversal Alça Corrente Dourada Luxo",
    originalPrice: 119.00,
    currentPrice: 49.90,
    discountPercentage: 58,
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/bolsa-corrente",
    affiliateUrl: "https://shope.ee/achadosnanda-bolsa-luxo",
    category: "Moda & Beleza",
    marketplace: "SHOPEE",
  },
];

export async function GET(request: Request) {
  return handleAutoRefill(request);
}

export async function POST(request: Request) {
  return handleAutoRefill(request);
}

async function handleAutoRefill(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // 1. Verifica contagem atual na fila
    const queueCount = await prisma.publication.count({
      where: {
        status: { in: ["PENDING", "SCHEDULED"] },
      },
    });

    // Se houver mais de 25 ofertas e não for forçado, não precisa reabastecer
    if (queueCount >= 25 && !force) {
      return NextResponse.json({
        success: true,
        message: `Fila suficientemente abastecida (${queueCount} ofertas restantes).`,
        addedCount: 0,
        queueCount,
      });
    }

    // 2. Busca ou cria Marketplace Shopee
    let marketplace = await prisma.marketplace.findFirst({
      where: { slug: "shopee" },
    });
    if (!marketplace) {
      marketplace = await prisma.marketplace.create({
        data: {
          name: "Shopee",
          slug: "shopee",
          badgeColor: "orange",
          commissionRate: 5.0,
        },
      });
    }

    // 3. Busca template padrão
    let template = await prisma.template.findFirst({
      where: { isDefault: true },
    });
    if (!template) {
      template = await prisma.template.findFirst();
    }

    // 4. Busca grupos ativos
    const activeGroups = await prisma.group.findMany({
      where: { whatsappJid: { not: null }, isActive: true },
    });

    // 5. Busca última publicação para saber o próximo orderIndex e horário
    const lastPub = await prisma.publication.findFirst({
      where: { status: { in: ["PENDING", "SCHEDULED"] } },
      orderBy: { scheduledFor: "desc" },
    });

    const now = new Date();
    let nextScheduledTime = lastPub?.scheduledFor
      ? new Date(new Date(lastPub.scheduledFor).getTime() + 8 * 60 * 1000)
      : new Date(now.getTime() + 8 * 60 * 1000);

    let nextOrderIndex = (lastPub?.orderIndex ?? 0) + 1;
    let addedCount = 0;

    for (const deal of TRENDING_REFILL_DEALS) {
      // Cria o produto
      const product = await prisma.product.create({
        data: {
          marketplaceId: marketplace.id,
          name: deal.title,
          category: deal.category,
          originalPrice: deal.originalPrice,
          currentPrice: deal.currentPrice,
          imageUrl: deal.imageUrl,
          originalUrl: deal.originalUrl,
          affiliateUrl: deal.affiliateUrl,
        },
      });

      // Cria a oferta
      const offer = await prisma.offer.create({
        data: {
          productId: product.id,
          marketplaceId: marketplace.id,
          title: deal.title,
          originalPrice: deal.originalPrice,
          currentPrice: deal.currentPrice,
          discountPercentage: deal.discountPercentage,
          savedAmount: deal.originalPrice - deal.currentPrice,
          originalUrl: deal.originalUrl,
          affiliateUrl: deal.affiliateUrl,
          status: "SCHEDULED",
          priority: 2,
        },
      });

      // Gera texto da mensagem
      // Gera texto da mensagem com link de afiliada oficial direto
      const directAffiliateUrl = offer.affiliateUrl || offer.originalUrl;

      let generatedText = "";
      if (template) {
        generatedText = generateOfferMessage(
          {
            title: offer.title,
            originalPrice: offer.originalPrice,
            currentPrice: offer.currentPrice,
            discountPercentage: offer.discountPercentage,
            savedAmount: offer.savedAmount,
            affiliateUrl: directAffiliateUrl,
            marketplaceName: marketplace.name,
          },
          template
        );
      } else {
        generatedText = `🔥 *${offer.title}*\n\nDe: ~R$ ${offer.originalPrice.toFixed(2)}~\nPor apenas: *R$ ${offer.currentPrice.toFixed(2)}* (${offer.discountPercentage}% OFF)\n\n👇 COMPRE PELO LINK ABAIXO:\n${directAffiliateUrl}`;
      }

      // Agenda publicação
      const jitter = Math.floor(Math.random() * 4) - 1; // Jitter de -1 a +2 min
      nextScheduledTime = new Date(nextScheduledTime.getTime() + (8 + jitter) * 60 * 1000);

      await prisma.publication.create({
        data: {
          offerId: offer.id,
          templateId: template?.id || "",
          status: "SCHEDULED",
          scheduledFor: nextScheduledTime,
          orderIndex: nextOrderIndex++,
          generatedText,
          publicationGroups: {
            create: activeGroups.map((g) => ({
              groupId: g.id,
              status: "PENDING",
            })),
          },
        },
      });

      addedCount++;
    }

    await prisma.auditLog.create({
      data: {
        action: "AUTO_REFILL_QUEUE",
        module: "QUEUE",
        details: `Reabastecimento autônomo da fila: ${addedCount} ofertas adicionadas com sucesso.`,
        status: "SUCCESS",
      },
    });

    await prisma.notification.create({
      data: {
        title: "✨ Fila Reabastecida",
        message: `${addedCount} novas ofertas em alta foram adicionadas automaticamente à fila!`,
        type: "SUCCESS",
        link: "/queue",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reabastecimento concluído! ${addedCount} novas ofertas foram agendadas.`,
      addedCount,
      totalQueue: queueCount + addedCount,
    });
  } catch (error: any) {
    console.error("Erro no auto-refill da fila:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
