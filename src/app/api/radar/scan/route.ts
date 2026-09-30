import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAutomationRules } from "@/modules/automation/engine";

export async function POST() {
  try {
    // Busca ofertas no radar ou rascunho
    const radarOffers = await prisma.offer.findMany({
      where: {
        status: { in: ["RADAR", "DRAFT"] },
      },
      include: {
        product: true,
        marketplace: true,
      },
    });

    const alertsTriggered: any[] = [];

    for (const offer of radarOffers) {
      // Simula / avalia queda de preço ou super desconto
      if (offer.discountPercentage >= 40 || offer.couponCode) {
        // Marca como oferta quente
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            callout: "🚨 BAIXOU DE PREÇO / SUPER OFERTA",
            priority: 2,
          },
        });

        // Avalia regras de automação (pode auto-enfileirar)
        await evaluateAutomationRules({
          id: offer.id,
          title: offer.title,
          category: offer.product.category,
          discountPercentage: offer.discountPercentage,
          hasCoupon: !!offer.couponCode,
          currentPrice: offer.currentPrice,
          originalPrice: offer.originalPrice,
        });

        alertsTriggered.push({
          id: offer.id,
          title: offer.title,
          discount: offer.discountPercentage,
          price: offer.currentPrice,
        });
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: radarOffers.length,
      alertsCount: alertsTriggered.length,
      alerts: alertsTriggered,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
