import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Métricas principais
    const offersTodayCount = await prisma.offer.count({
      where: { createdAt: { gte: todayStart } },
    });

    const queuedOffersCount = await prisma.publication.count({
      where: { status: "PENDING" },
    });

    const scheduledOffersCount = await prisma.publication.count({
      where: { status: "SCHEDULED" },
    });

    const totalClicks = await prisma.click.count();
    const totalConversions = await prisma.conversion.count({
      where: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
    });

    const commissions = await prisma.conversion.aggregate({
      _sum: { commissionValue: true },
      where: { status: { in: ["PENDING", "APPROVED", "PAID"] } },
    });
    const estimatedCommission = commissions._sum.commissionValue || 0;

    // 2. Ofertas de destaque
    const featuredOffers = await prisma.offer.findMany({
      take: 5,
      orderBy: [{ priority: "desc" }, { discountPercentage: "desc" }],
      include: {
        product: true,
        marketplace: true,
        _count: {
          select: { clicks: true, conversions: true },
        },
      },
    });

    // 3. Próximas publicações na fila
    const upcomingPublications = await prisma.publication.findMany({
      where: {
        status: { in: ["PENDING", "SCHEDULED"] },
      },
      take: 6,
      orderBy: [{ scheduledFor: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
      include: {
        offer: {
          include: { product: true, marketplace: true },
        },
        template: true,
        publicationGroups: {
          include: { group: true },
        },
      },
    });

    // 4. Desempenho por Marketplace
    const marketplaces = await prisma.marketplace.findMany({
      include: {
        _count: {
          select: { offers: true, products: true },
        },
        offers: {
          select: {
            _count: { select: { clicks: true, conversions: true } },
          },
        },
      },
    });

    const marketplacePerformance = marketplaces.map((m) => {
      const clicks = m.offers.reduce((acc, curr) => acc + curr._count.clicks, 0);
      const conversions = m.offers.reduce((acc, curr) => acc + curr._count.conversions, 0);
      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        badgeColor: m.badgeColor,
        commissionRate: m.commissionRate,
        offersCount: m._count.offers,
        productsCount: m._count.products,
        clicks,
        conversions,
      };
    });

    // 5. Dados de evolução dos últimos 7 dias para o gráfico
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: days[d.getDay()], cliques: 0, conversoes: 0, comissao: 0 };
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          offersTodayCount,
          queuedOffersCount,
          scheduledOffersCount,
          totalClicks: totalClicks || 0,
          totalConversions: totalConversions || 0,
          estimatedCommission: estimatedCommission || 0,
        },
        featuredOffers,
        upcomingPublications,
        marketplacePerformance,
        chartData,
      },
    });
  } catch (error: any) {
    console.error("Erro ao carregar dados do dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar dashboard." },
      { status: 500 }
    );
  }
}
