import { NextResponse } from "next/server";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { links, text } = body;

    let targetUrls: string[] = [];

    if (Array.isArray(links)) {
      targetUrls = links;
    } else if (typeof text === "string") {
      targetUrls = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    }

    if (targetUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum link do Mercado Livre foi fornecido." },
        { status: 400 }
      );
    }

    const products = await MercadoLivreScraperService.resolveLinks(targetUrls);

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
    });
  } catch (err: any) {
    console.error("Erro ao resolver links do Mercado Livre:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
