import { prisma } from "@/lib/prisma";

export interface MirroredLinkResult {
  originalUrl: string;
  affiliateUrl: string;
  platform: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON" | "MAGALU" | "OUTRO";
}

export class MirrorEngine {
  /**
   * Detecta plataforma e converte URL para o link de afiliada oficial da Nanda
   */
  static convertUrl(url: string): MirroredLinkResult {
    let clean = url.trim();
    const low = clean.toLowerCase();

    // 1. Mercado Livre
    if (low.includes("mercadolivre.com") || low.includes("mercadolibre.com") || low.includes("meli.la")) {
      const tag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "meli-achadosnanda";
      if (clean.includes("matt_tool=")) {
        clean = clean.replace(/matt_tool=[^&]+/g, `matt_tool=${tag}`);
      } else {
        clean += (clean.includes("?") ? "&" : "?") + `matt_tool=${tag}&tracking_id=${tag}`;
      }
      return { originalUrl: url, affiliateUrl: clean, platform: "MERCADO_LIVRE" };
    }

    // 2. Shopee
    if (low.includes("shopee.com") || low.includes("shope.ee") || low.includes("s.shopee.com.br")) {
      const tag = process.env.SHOPEE_AFFILIATE_TAG || "achadosdananda-20";
      if (clean.includes("utm_source=")) {
        clean = clean.replace(/utm_source=[^&]+/g, `utm_source=${tag}`);
      } else {
        clean += (clean.includes("?") ? "&" : "?") + `utm_source=${tag}&aff_sub=${tag}`;
      }
      return { originalUrl: url, affiliateUrl: clean, platform: "SHOPEE" };
    }

    // 3. Amazon
    if (low.includes("amazon.com") || low.includes("amzn.to") || low.includes("a.co")) {
      const tag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";
      if (clean.includes("tag=")) {
        clean = clean.replace(/tag=[^&]+/g, `tag=${tag}`);
      } else {
        clean += (clean.includes("?") ? "&" : "?") + `tag=${tag}`;
      }
      return { originalUrl: url, affiliateUrl: clean, platform: "AMAZON" };
    }

    // 4. Magalu
    if (low.includes("magazineluiza.com") || low.includes("magazinevoce.com") || low.includes("magalu.me")) {
      return { originalUrl: url, affiliateUrl: clean, platform: "MAGALU" };
    }

    return { originalUrl: url, affiliateUrl: clean, platform: "OUTRO" };
  }

  /**
   * Modo CLONE: Mantém exatamente a mensagem original do concorrente, trocando apenas os links de afiliado
   */
  static cloneMessage(text: string): {
    clonedText: string;
    replacedLinks: MirroredLinkResult[];
  } {
    if (!text) return { clonedText: "", replacedLinks: [] };

    // Regex para capturar URLs http / https
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const replacedLinks: MirroredLinkResult[] = [];

    const clonedText = text.replace(urlRegex, (match) => {
      // Remove pontuação acidental no final do link
      let rawUrl = match;
      let trailingPunct = "";
      if (/[.,!?;)]$/.test(rawUrl)) {
        trailingPunct = rawUrl.slice(-1);
        rawUrl = rawUrl.slice(0, -1);
      }

      const res = this.convertUrl(rawUrl);
      if (res.platform !== "OUTRO") {
        replacedLinks.push(res);
        return res.affiliateUrl + trailingPunct;
      }
      return match;
    });

    return { clonedText, replacedLinks };
  }
}
