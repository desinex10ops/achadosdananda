import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const marketplaceId = searchParams.get("marketplaceId") || undefined;
    const category = searchParams.get("category") || undefined;

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { brand: { contains: q } },
        { category: { contains: q } },
      ];
    }
    if (marketplaceId) where.marketplaceId = marketplaceId;
    if (category) where.category = category;

    const products = await prisma.product.findMany({
      where,
      include: {
        marketplace: true,
        offers: {
          select: { id: true, status: true, discountPercentage: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao listar produtos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category = "Geral",
      subcategory,
      brand,
      originalPrice,
      currentPrice,
      imageUrl,
      originalUrl,
      affiliateUrl,
      stock,
      marketplaceId,
      notes,
    } = body;

    if (!name || !originalPrice || !currentPrice || !imageUrl || !marketplaceId) {
      return NextResponse.json(
        { success: false, error: "Nome, preços, imagem e marketplace são obrigatórios." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        category,
        subcategory,
        brand,
        originalPrice: parseFloat(originalPrice),
        currentPrice: parseFloat(currentPrice),
        imageUrl,
        originalUrl: originalUrl || "",
        affiliateUrl: affiliateUrl || originalUrl || "",
        stock: stock ? parseInt(stock) : null,
        marketplaceId,
        notes,
      },
      include: { marketplace: true },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao criar produto." },
      { status: 500 }
    );
  }
}
