import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (Array.isArray(items) && items.length > 0) {
      // 1. Armazena no cache em memória
      MercadoLivreScraperService.storeCachedItems(items);

      // 2. Persiste permanentemente no banco SQLite (Prisma Product)
      let marketplace = await prisma.marketplace.findFirst({
        where: {
          OR: [
            { slug: "mercado-livre" },
            { slug: "mercadolivre" },
            { name: "Mercado Livre" },
          ],
        },
      });
      if (!marketplace) {
        marketplace = await prisma.marketplace.create({
          data: {
            name: "Mercado Livre",
            slug: "mercado-livre",
            badgeColor: "yellow",
            commissionRate: 8.0,
          },
        });
      }

      for (const item of items) {
        if (!item.url || !item.imageUrl) continue;
        const cleanUrl = item.url.split("?")[0].split("#")[0];
        const origPrice = Number(item.originalPrice) || Number(item.currentPrice) || 99.90;
        const currPrice = Number(item.currentPrice) || origPrice;

        const mlbMatch = cleanUrl.match(/mlb[u]?-?(\d+)/i);
        const mlbId = mlbMatch ? mlbMatch[1] : null;

        const orClauses: any[] = [
          { originalUrl: cleanUrl },
          { originalUrl: cleanUrl.toLowerCase() },
        ];
        if (mlbId) {
          orClauses.push({ originalUrl: { contains: mlbId } });
        }

        const existing = await prisma.product.findFirst({
          where: { OR: orClauses },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: item.title || existing.name,
              imageUrl: item.imageUrl,
              currentPrice: currPrice,
              originalPrice: origPrice,
            },
          });
        } else {
          await prisma.product.create({
            data: {
              marketplaceId: marketplace.id,
              name: item.title || "Produto Mercado Livre",
              imageUrl: item.imageUrl,
              originalUrl: cleanUrl,
              currentPrice: currPrice,
              originalPrice: origPrice,
              category: "Mercado Livre",
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `${items.length} produtos salvos com fotos reais no banco de dados!`,
      });
    }

    return NextResponse.json({ success: false, error: "Nenhum item fornecido." }, { status: 400 });
  } catch (err: any) {
    console.error("Erro ao salvar cache de produtos:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
