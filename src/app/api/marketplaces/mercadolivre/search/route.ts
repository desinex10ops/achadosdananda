import { NextResponse } from "next/server";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || searchParams.get("q") || "";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const products = await MercadoLivreScraperService.searchProducts(keyword, limit);

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
      source: "MERCADO_LIVRE_SEARCH",
    });
  } catch (err: any) {
    console.error("Erro na busca de produtos do Mercado Livre:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const keyword = body.keyword || body.query || body.text || "";
    const limit = body.limit ? parseInt(body.limit, 10) : 50;

    const products = await MercadoLivreScraperService.searchProducts(keyword, limit);

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
      source: "MERCADO_LIVRE_SEARCH",
    });
  } catch (err: any) {
    console.error("Erro no POST de busca de produtos do Mercado Livre:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
