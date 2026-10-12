export interface MirroredLinkResult {
  originalUrl: string;
  resolvedUrl?: string;
  fullAffiliateUrl?: string;
  affiliateUrl: string;
  productImageUrl?: string | null;
  platform: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON" | "MAGALU" | "OUTRO";
}

// Cache em memória para respostas instantâneas
const resolvedCache = new Map<string, MirroredLinkResult>();

export class MirrorEngine {
  /**
   * Formata uma URL do Mercado Livre na versão CURTA OFICIAL com "/meli/" no domínio oficial
   * Ex: https://mercadolivre.com.br/meli/p/MLB50055051?matt_word=clma9212398
   * Assim o link fica curto e mantém 100% da confiança do domínio oficial mercadolivre.com.br/meli!
   */
  static toShortOfficialMeliUrl(productUrl: string, tag: string): string {
    const clean = productUrl.split("?")[0].split("#")[0];

    // Caso 1: Catálogo /p/MLB12345678
    const pMatch = clean.match(/\/(p\/MLB\d+)/i);
    if (pMatch?.[1]) {
      return `https://mercadolivre.com.br/meli/${pMatch[1].toUpperCase()}?matt_word=${tag}`;
    }

    // Caso 2: Anúncio MLB-1234567890
    const mlbMatch = clean.match(/(MLB-?\d{7,14})/i);
    if (mlbMatch?.[1]) {
      const normalizedMlb = mlbMatch[1].toUpperCase().startsWith("MLB-")
        ? mlbMatch[1].toUpperCase()
        : mlbMatch[1].toUpperCase().replace(/^MLB/, "MLB-");
      return `https://produto.mercadolivre.com.br/${normalizedMlb}?matt_word=${tag}`;
    }

    // Caso 3: /up/MLBU...
    const upMatch = clean.match(/\/(up\/MLBU\d+)/i);
    if (upMatch?.[1]) {
      return `https://mercadolivre.com.br/meli/${upMatch[1]}?matt_word=${tag}`;
    }

    return `${clean}?matt_word=${tag}`;
  }

  /**
   * Converte qualquer URL de imagem do Mercado Livre (D_NQ_NP_...-O.webp)
   * para o formato QUADRADO 1:1 COM BORDA BRANCA OFICIAL (D_Q_NP_2X_...-F.jpg).
   * Isso garante que o WhatsApp NUNCA corte o topo ou a base do produto (como frascos de perfume)!
   */
  static toSquareUncroppedImageUrl(rawImgUrl: string | null): string | null {
    if (!rawImgUrl) return null;
    let img = rawImgUrl.trim();

    if (img.includes("mlstatic.com")) {
      // Troca D_NQ_NP_ (sem preenchimento quadrado, que corta no WhatsApp) por D_Q_NP_2X_ (quadrado 1:1 perfeito)
      img = img.replace(/D_NQ_NP_(?:2X_)?/i, "D_Q_NP_2X_");
      img = img.replace(/D_Q_NP_(?!2X_)/i, "D_Q_NP_2X_");
      // Troca sufixo -O.webp / -V.webp / -T.webp por -F.jpg
      img = img.replace(/-[A-Z]\.(?:webp|jpg|jpeg|png)$/i, "-F.jpg");
      if (img.toLowerCase().endsWith(".webp")) {
        img = img.replace(/\.webp$/i, ".jpg");
      }
    }

    return img;
  }

  /**
   * Extrai a URL da imagem principal do produto a partir do HTML e converte para formato quadrado 1:1 sem cortes
   */
  static extractProductImageFromHtml(html: string): string | null {
    if (!html) return null;

    // 1. Tenta og:image
    const ogMatch =
      html.match(
        /property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /content=["']([^"']+)["'][^>]*property=["']og:image["']/i
      );

    let imgUrl = ogMatch?.[1] || null;

    // 2. Fallback para imagem do card em destaque no Mercado Livre
    if (!imgUrl || imgUrl.includes("logo") || imgUrl.includes("avatar")) {
      const mlImgMatch = html.match(
        /https:\/\/http2\.mlstatic\.com\/D_Q?_?NP_[^"'<>\s)]+\.(?:webp|jpg|png)/i
      );
      if (mlImgMatch?.[0]) {
        imgUrl = mlImgMatch[0];
      }
    }

    return this.toSquareUncroppedImageUrl(imgUrl);
  }

  /**
   * Detecta plataforma e converte URL direta para o link de afiliada oficial da Nanda
   */
  static convertUrl(url: string): MirroredLinkResult {
    const clean = url.trim();
    const low = clean.toLowerCase();

    // 1. Mercado Livre
    if (
      low.includes("mercadolivre.com") ||
      low.includes("mercadolibre.com") ||
      low.includes("meli.la")
    ) {
      const tag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";
      const base = clean.split("#")[0];

      if (
        base.includes("/p/MLB") ||
        base.includes("MLB-") ||
        base.includes("/up/MLBU")
      ) {
        const shortMeli = this.toShortOfficialMeliUrl(base, tag);
        return {
          originalUrl: url,
          fullAffiliateUrl: shortMeli,
          affiliateUrl: shortMeli,
          platform: "MERCADO_LIVRE",
        };
      }

      try {
        const parsed = new URL(base);
        parsed.searchParams.delete("matt_word");
        parsed.searchParams.delete("matt_tool");
        parsed.searchParams.delete("matt_tool_id");
        parsed.searchParams.delete("tracking_id");
        parsed.searchParams.set("matt_word", tag);
        return {
          originalUrl: url,
          fullAffiliateUrl: parsed.toString(),
          affiliateUrl: parsed.toString(),
          platform: "MERCADO_LIVRE",
        };
      } catch {
        const noQuery = base.split("?")[0];
        const full = `${noQuery}?matt_word=${tag}`;
        return {
          originalUrl: url,
          fullAffiliateUrl: full,
          affiliateUrl: full,
          platform: "MERCADO_LIVRE",
        };
      }
    }

    // 2. Shopee
    if (
      low.includes("shopee.com") ||
      low.includes("shope.ee") ||
      low.includes("s.shopee.com.br")
    ) {
      const tag = process.env.SHOPEE_AFFILIATE_TAG || "achadosdananda-20";
      const noQuery = clean.split("?")[0].split("#")[0];
      const full = `${noQuery}?utm_source=${tag}&aff_sub=${tag}`;
      return {
        originalUrl: url,
        fullAffiliateUrl: full,
        affiliateUrl: full,
        platform: "SHOPEE",
      };
    }

    // 3. Amazon
    if (
      low.includes("amazon.com") ||
      low.includes("amzn.to") ||
      low.includes("a.co") ||
      low.includes("link.amazon")
    ) {
      const tag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";
      const asinMatch = clean.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch?.[1]) {
        const shortAmz = `https://amazon.com.br/dp/${asinMatch[1].toUpperCase()}?tag=${tag}`;
        return {
          originalUrl: url,
          fullAffiliateUrl: shortAmz,
          affiliateUrl: shortAmz,
          platform: "AMAZON",
        };
      }
      const noQuery = clean.split("?")[0].split("#")[0];
      const full = `${noQuery}?tag=${tag}`;
      return {
        originalUrl: url,
        fullAffiliateUrl: full,
        affiliateUrl: full,
        platform: "AMAZON",
      };
    }

    // 4. Magalu
    if (
      low.includes("magazineluiza.com") ||
      low.includes("magazinevoce.com") ||
      low.includes("magalu.me")
    ) {
      const tag = process.env.MAGALU_AFFILIATE_ID || "magalu-nanda";
      let updated = clean;
      if (updated.includes("magazinevoce.com.br/")) {
        updated = updated.replace(
          /magazinevoce\.com\.br\/[^/]+/i,
          `magazinevoce.com.br/${tag}`
        );
      }
      return {
        originalUrl: url,
        fullAffiliateUrl: updated,
        affiliateUrl: updated,
        platform: "MAGALU",
      };
    }

    return {
      originalUrl: url,
      fullAffiliateUrl: clean,
      affiliateUrl: clean,
      platform: "OUTRO",
    };
  }

  /**
   * Desencurta links de concorrentes (meli.la, dailydoachadin, s.shopee.com.br, shope.ee, amzn.to, link.amazon),
   * extrai a foto quadrada 1:1 sem cortes (D_Q_NP_2X_...-F.jpg) e gera o link curto oficial mercadolivre.com.br/meli/...
   */
  static async resolveAndConvertUrl(rawUrl: string): Promise<MirroredLinkResult> {
    const cleanRaw = rawUrl.trim();
    const cached = resolvedCache.get(cleanRaw);
    if (cached) return cached;

    const mlTag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";
    const shopeeTag = process.env.SHOPEE_AFFILIATE_TAG || "achadosdananda-20";
    const amazonTag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const res = await fetch(cleanRaw, {
        redirect: "follow",
        headers: {
          "User-Agent": "WhatsApp/2.24.12.78 A",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      let finalUrl = res.url || cleanRaw;
      const html = await res.text().catch(() => "");
      let productImageUrl = this.extractProductImageFromHtml(html);

      // Caso 1: Redirecionador intermediário caiu num link curto da Shopee
      if (
        finalUrl.includes("s.shopee.com.br") ||
        finalUrl.includes("shope.ee")
      ) {
        try {
          const c2 = new AbortController();
          const t2 = setTimeout(() => c2.abort(), 4500);
          const r2 = await fetch(finalUrl, {
            redirect: "follow",
            headers: { "User-Agent": "WhatsApp/2.24.12.78 A" },
            signal: c2.signal,
          });
          clearTimeout(t2);
          if (r2.url && r2.url.includes("shopee.com.br")) {
            finalUrl = r2.url;
          }
          if (!productImageUrl) {
            const html2 = await r2.text().catch(() => "");
            productImageUrl = this.extractProductImageFromHtml(html2);
          }
        } catch {}
      }

      // Caso 2: É página social do Mercado Livre (/social/...) ou meli.la
      if (
        finalUrl.includes("mercadolivre.com") ||
        finalUrl.includes("meli.la") ||
        html.includes("mercadolivre.com.br")
      ) {
        // Prioriza o card principal em destaque (card-featured) da página /social/
        const featuredMatch = html.match(
          /https?:\/\/[^"'<>\s]*mercadolivre\.com\.br\/[^"'<>\s]*card-featured[^"'<>\s]*/i
        );

        const allMlLinks =
          html.match(
            /https?:\/\/[^"'<>\s]*mercadolivre\.com\.br\/[^"'<>\s]+/gi
          ) || [];

        const productLink =
          featuredMatch?.[0] ||
          allMlLinks.find(
            (u) =>
              (u.includes("/p/MLB") ||
                u.includes("MLB-") ||
                u.includes("/up/MLBU")) &&
              !u.includes("noindex") &&
              !u.includes("security.js")
          );

        if (productLink) {
          const cleanProductUrl = productLink
            .replace(/&amp;/g, "&")
            .split("?")[0]
            .split("#")[0];
          const shortOfficialMeli = this.toShortOfficialMeliUrl(
            cleanProductUrl,
            mlTag
          );
          const result: MirroredLinkResult = {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            fullAffiliateUrl: `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`,
            affiliateUrl: shortOfficialMeli,
            productImageUrl,
            platform: "MERCADO_LIVRE",
          };
          resolvedCache.set(cleanRaw, result);
          return result;
        }

        if (
          finalUrl.includes("/p/MLB") ||
          finalUrl.includes("MLB-") ||
          finalUrl.includes("/up/MLBU")
        ) {
          const cleanProductUrl = finalUrl.split("?")[0].split("#")[0];
          const shortOfficialMeli = this.toShortOfficialMeliUrl(
            cleanProductUrl,
            mlTag
          );
          const result: MirroredLinkResult = {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            fullAffiliateUrl: `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`,
            affiliateUrl: shortOfficialMeli,
            productImageUrl,
            platform: "MERCADO_LIVRE",
          };
          resolvedCache.set(cleanRaw, result);
          return result;
        }

        const converted = this.convertUrl(finalUrl);
        const result: MirroredLinkResult = {
          ...converted,
          originalUrl: rawUrl,
          productImageUrl,
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }

      // Caso 3: Shopee
      if (finalUrl.includes("shopee.com") || finalUrl.includes("shope.ee")) {
        const cleanShopee = finalUrl.split("?")[0].split("#")[0];
        const fullAffiliateUrl = `${cleanShopee}?utm_source=${shopeeTag}&aff_sub=${shopeeTag}`;
        const result: MirroredLinkResult = {
          originalUrl: rawUrl,
          resolvedUrl: cleanShopee,
          fullAffiliateUrl,
          affiliateUrl: fullAffiliateUrl,
          productImageUrl,
          platform: "SHOPEE",
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }

      // Caso 4: Amazon
      if (
        finalUrl.includes("amazon.com") ||
        finalUrl.includes("amzn.to") ||
        finalUrl.includes("link.amazon")
      ) {
        const convertedAmz = this.convertUrl(finalUrl);
        const result: MirroredLinkResult = {
          ...convertedAmz,
          originalUrl: rawUrl,
          productImageUrl,
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }
    } catch {}

    return this.convertUrl(cleanRaw);
  }

  /**
   * Limpa assinaturas de grupos concorrentes mantendo 100% da oferta original
   */
  static sanitizeCompetitorFooters(text: string): string {
    return text
      .replace(/Oferta exclusiva encontrada no grupo[^\n]*\n*/gi, "")
      .replace(/encontrad[ao] no grupo[^\n]*\n*/gi, "")
      .replace(/Promo de Rica[^\n]*\n*/gi, "")
      .replace(/Só entram no AchaDIN[^\n]*\n*/gi, "")
      .replace(/🔥\s*ACHADIN DO DIA\s*/gi, "🔥 OFERTA DO DIA ")
      .replace(/Participe do nosso grupo[^\n]*\n*/gi, "")
      .replace(/Entre no nosso grupo[^\n]*\n*/gi, "")
      .replace(/Entre no grupo[^\n]*\n*/gi, "")
      .replace(/Link do grupo[^\n]*\n*/gi, "")
      .trim();
  }

  /**
   * Modo CLONE Síncrono
   */
  static cloneMessage(text: string): {
    clonedText: string;
    replacedLinks: MirroredLinkResult[];
  } {
    if (!text) return { clonedText: "", replacedLinks: [] };

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const replacedLinks: MirroredLinkResult[] = [];

    let clonedText = text.replace(urlRegex, (match) => {
      let rawUrl = match;
      let trailingPunct = "";
      if (/[.,!?;)]$/.test(rawUrl)) {
        trailingPunct = rawUrl.slice(-1);
        rawUrl = rawUrl.slice(0, -1);
      }

      const low = rawUrl.toLowerCase();
      if (
        low.includes("chat.whatsapp.com") ||
        low.includes("whatsapp.com/channel") ||
        low.includes("t.me/") ||
        low.includes("telegram.me/")
      ) {
        return "";
      }

      const res = this.convertUrl(rawUrl);
      if (res.platform !== "OUTRO") {
        replacedLinks.push(res);
        return res.affiliateUrl + trailingPunct;
      }
      return match;
    });

    clonedText = this.sanitizeCompetitorFooters(clonedText);
    return { clonedText, replacedLinks };
  }

  /**
   * Modo CLONE Assíncrono Completo:
   * Desencurta links, extrai a foto quadrada 1:1 sem cortes (D_Q_NP_2X_...-F.jpg)
   * e aplica o link curto oficial mercadolivre.com.br/meli/... com a tag da Nanda!
   */
  static async cloneMessageAsync(text: string): Promise<{
    clonedText: string;
    replacedLinks: MirroredLinkResult[];
    productImageUrl: string | null;
  }> {
    if (!text)
      return { clonedText: "", replacedLinks: [], productImageUrl: null };

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = Array.from(text.matchAll(urlRegex));
    const replacedLinks: MirroredLinkResult[] = [];
    let clonedText = text;
    let firstProductImage: string | null = null;

    for (const m of matches) {
      const fullMatch = m[0];
      let rawUrl = fullMatch;
      let trailingPunct = "";
      if (/[.,!?;)]$/.test(rawUrl)) {
        trailingPunct = rawUrl.slice(-1);
        rawUrl = rawUrl.slice(0, -1);
      }

      const low = rawUrl.toLowerCase();
      if (
        low.includes("chat.whatsapp.com") ||
        low.includes("whatsapp.com/channel") ||
        low.includes("t.me/") ||
        low.includes("telegram.me/")
      ) {
        clonedText = clonedText.replace(fullMatch, "");
        continue;
      }

      const resolved = await this.resolveAndConvertUrl(rawUrl);
      replacedLinks.push(resolved);
      if (!firstProductImage && resolved.productImageUrl) {
        firstProductImage = resolved.productImageUrl;
      }
      clonedText = clonedText.replace(
        fullMatch,
        resolved.affiliateUrl + trailingPunct
      );
    }

    clonedText = this.sanitizeCompetitorFooters(clonedText);
    return {
      clonedText,
      replacedLinks,
      productImageUrl: firstProductImage,
    };
  }
}
