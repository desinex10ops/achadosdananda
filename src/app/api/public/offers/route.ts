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

    return NextResponse.json({ success: true, offers: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
