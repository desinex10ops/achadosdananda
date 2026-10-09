import { NextResponse } from "next/server";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { links, text, items } = body;

    let rawInputs: string[] = [];

    if (Array.isArray(links)) {
      rawInputs = links.map(String);
    } else if (typeof links === "string") {
      rawInputs = [links];
    } else if (typeof text === "string") {
      rawInputs = [text];
    } else if (Array.isArray(items)) {
      rawInputs = items.map((it: any) => it.url || it.originalUrl || "").filter(Boolean);
    }

    if (rawInputs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum link do Mercado Livre foi fornecido." },
        { status: 400 }
      );
    }

    const urlRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?(?:mercadolivre\.com\.br|mercadolibre\.com|meli\.la)\/[^\s"'<>()[\]]+/gi;
    const extractedUrls: string[] = [];

    for (const raw of rawInputs) {
      const matches = raw.match(urlRegex);
      if (matches && matches.length > 0) {
        extractedUrls.push(...matches);
      } else if (raw.includes("mercadolivre.com") || raw.includes("meli.la")) {
        extractedUrls.push(raw.trim());
      }
    }

    if (extractedUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum link válido do Mercado Livre foi encontrado no texto." },
        { status: 400 }
      );
    }

    const products = await MercadoLivreScraperService.resolveLinks(extractedUrls);

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
