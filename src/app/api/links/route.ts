import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const links = await prisma.affiliateLink.findMany({
      include: {
        marketplace: true,
        product: true,
        _count: {
          select: { clicks: true, conversions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: links });
  } catch (error: any) {
    console.error("Erro ao listar links:", error);
    return NextResponse.json({ success: false, error: "Falha ao carregar links." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, marketplaceId, originalUrl, affiliateUrl, campaign } = body;

    if (!marketplaceId || !affiliateUrl) {
      return NextResponse.json(
        { success: false, error: "Marketplace e URL afiliada são obrigatórios." },
        { status: 400 }
      );
    }

    const link = await prisma.affiliateLink.create({
      data: {
        productId: productId || null,
        marketplaceId,
        originalUrl: originalUrl || affiliateUrl,
        affiliateUrl,
        campaign: campaign || "Geral",
      },
      include: {
        marketplace: true,
        product: true,
      },
    });

    return NextResponse.json({ success: true, data: link }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar link rastreável:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
