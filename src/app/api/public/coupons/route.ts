import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketplace = searchParams.get("marketplace");

    const where: any = {
      status: "ACTIVE",
    };

    if (marketplace && marketplace !== "ALL") {
      where.marketplace = {
        name: { contains: marketplace, mode: "insensitive" },
      };
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        marketplace: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      marketplace: c.marketplace?.name || "Geral",
      storeLogo: c.marketplace?.icon || "",
      discount: c.discount,
      description: c.notes || `Cupom de desconto para ${c.marketplace?.name}`,
      minSpend: c.minSpend ? `Gasto mín. R$ ${c.minSpend.toFixed(2)}` : "Sem valor mínimo",
      validUntil: c.validUntil ? new Date(c.validUntil).toLocaleDateString("pt-BR") : "Válido hoje",
      affiliateUrl: c.link || c.marketplace?.defaultUrlPattern || "#",
      category: c.category || "Geral",
      isHot: c.status === "ACTIVE",
    }));

    return NextResponse.json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
