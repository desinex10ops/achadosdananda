import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const marketplaceSlug = searchParams.get("marketplace") || "";
    const sort = searchParams.get("sort") || "newest";

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { category: { contains: q } } },
      ];
    }

    if (category && category !== "Todas") {
      where.product = {
        category: { contains: category },
      };
    }

    if (marketplaceSlug && marketplaceSlug !== "todos") {
      where.marketplace = {
        slug: { contains: marketplaceSlug.toLowerCase() },
      };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "discount") {
      orderBy = { discountPercentage: "desc" };
    } else if (sort === "price_asc") {
      orderBy = { currentPrice: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { currentPrice: "desc" };
    }

    const offers = await prisma.offer.findMany({
      where,
      orderBy,
      take: 50,
      include: {
        marketplace: true,
        product: true,
      },
    });

    const formatted = offers.map((o) => ({
      id: o.id,
      title: o.title,
      currentPrice: o.currentPrice,
      originalPrice: o.originalPrice,
      discountPercentage: o.discountPercentage,
      couponCode: o.couponCode,
      shippingInfo: o.shippingInfo || "Frete Grátis",
      imageUrl: o.product?.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
      marketplace: o.marketplace?.name || "Shopee",
      marketplaceSlug: o.marketplace?.slug || "shopee",
      category: o.product?.category || "Geral",
      affiliateUrl: `/r/${o.id}`,
    }));

    if (formatted.length === 0 && !q && !category && !marketplaceSlug) {
      return NextResponse.json({
        success: true,
        offers: [
          {
            id: "sample_1",
            title: "Fritadeira Elétrica Philco Air Fryer 12L Oven",
            currentPrice: 389.9,
            originalPrice: 1199.9,
            discountPercentage: 67,
            couponCode: "PHILCO10",
            shippingInfo: "Frete Grátis",
            imageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=400&q=80",
            marketplace: "Amazon",
            marketplaceSlug: "amazon",
            category: "Cozinha",
            affiliateUrl: "#",
          },
          {
            id: "sample_2",
            title: "Garrafa Térmica Kouda 500ml Aço Inox Vácuo",
            currentPrice: 49.9,
            originalPrice: 129.9,
            discountPercentage: 61,
            couponCode: "KOUDA5",
            shippingInfo: "Frete Grátis com cupom",
            imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80",
            marketplace: "Shopee",
            marketplaceSlug: "shopee",
            category: "Casa",
            affiliateUrl: "#",
          },
          {
            id: "sample_3",
            title: "Robô Aspirador de Pó Inteligente WAP Robot",
            currentPrice: 329.0,
            originalPrice: 799.0,
            discountPercentage: 58,
            couponCode: null,
            shippingInfo: "Frete Grátis Prime",
            imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
            marketplace: "Mercado Livre",
            marketplaceSlug: "mercado-livre",
            category: "Eletrônicos",
            affiliateUrl: "#",
          },
        ],
      });
    }

    return NextResponse.json({ success: true, offers: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
