export interface MirroredLinkResult {
  originalUrl: string;
  resolvedUrl?: string;
  fullAffiliateUrl?: string;
  affiliateUrl: string;
  productImageUrl?: string | null;
  platform: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON" | "MAGALU" | "OUTRO";
}

// Cache em memória para evitar chamadas repetidas ao encurtador e desencurtador
const resolvedCache = new Map<string, MirroredLinkResult>();
const shortUrlCache = new Map<string, string>();

export class MirrorEngine {
  /**
   * Encurta uma URL longa de afiliado usando TinyURL para ficar limpa e curta no WhatsApp
   */
  static async shortenUrl(longUrl: string): Promise<string> {
    if (!longUrl || longUrl.length < 42) return longUrl;
    const cached = shortUrlCache.get(longUrl);
    if (cached) return cached;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2800);
      const res = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (res.ok) {
        const short = (await res.text()).trim();
        if (short.startsWith("https://tinyurl.com/")) {
          shortUrlCache.set(longUrl, short);
          return short;
        }
      }
    } catch {}

    return longUrl;
  }

  /**
   * Extrai a URL da imagem principal do produto a partir do HTML da página (Mercado Livre, Shopee, Amazon)
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

    // 2. Fallback para imagem de alta resolução do Mercado Livre (-O.webp / -O.jpg)
    if (!imgUrl || imgUrl.includes("logo") || imgUrl.includes("avatar")) {
      const mlImgMatch = html.match(
        /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'<>\s)]+-O\.(?:webp|jpg|png)/i
      );
      if (mlImgMatch?.[0]) {
        imgUrl = mlImgMatch[0];
      }
    }

    if (!imgUrl) return null;

    // Converte .webp do Mercado Livre para .jpg para máxima compatibilidade no envio de mídia do WhatsApp
    if (
      imgUrl.includes("mlstatic.com") &&
      imgUrl.toLowerCase().endsWith(".webp")
    ) {
      imgUrl = imgUrl.replace(/\.webp$/i, ".jpg");
    }

    return imgUrl;
  }

  /**
   * Detecta plataforma e converte URL direta para o link de afiliada oficial da Nanda
   */
  static convertUrl(url: string): MirroredLinkResult {
    let clean = url.trim();
    const low = clean.toLowerCase();

    // 1. Mercado Livre
    if (
      low.includes("mercadolivre.com") ||
      low.includes("mercadolibre.com") ||
      low.includes("meli.la")
    ) {
      const tag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";
      const base = clean.split("#")[0];
      try {
        const parsed = new URL(base);
        parsed.searchParams.delete("matt_word");
        parsed.searchParams.delete("matt_tool");
        parsed.searchParams.delete("matt_tool_id");
        parsed.searchParams.delete("tracking_id");
        parsed.searchParams.delete("c");
        parsed.searchParams.delete("g");
        parsed.searchParams.set("matt_tool", tag);
        parsed.searchParams.set("matt_word", tag);
        return {
          originalUrl: url,
          fullAffiliateUrl: parsed.toString(),
          affiliateUrl: parsed.toString(),
          platform: "MERCADO_LIVRE",
        };
      } catch {
        const noQuery = base.split("?")[0];
        const full = `${noQuery}?matt_tool=${tag}&matt_word=${tag}`;
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
      low.includes("a.co")
    ) {
      const tag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";
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
   * Desencurta links de concorrentes (meli.la, dailydoachadin, s.shopee.com.br, shope.ee, amzn.to),
   * extrai a foto oficial do produto (og:image), aplica a tag de afiliada da Nanda e encurta o link final!
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
        const allMlLinks =
          html.match(
            /https?:\/\/[^"'<>\s]*mercadolivre\.com\.br\/[^"'<>\s]+/gi
          ) || [];
        const productLink = allMlLinks.find(
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
          const fullAffiliateUrl = `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`;
          const shortAffiliateUrl = await this.shortenUrl(fullAffiliateUrl);
          const result: MirroredLinkResult = {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            fullAffiliateUrl,
            affiliateUrl: shortAffiliateUrl,
            productImageUrl,
            platform: "MERCADO_LIVRE",
          };
          resolvedCache.set(cleanRaw, result);
          return result;
        }

        if (finalUrl.includes("/p/MLB") || finalUrl.includes("MLB-")) {
          const cleanProductUrl = finalUrl.split("?")[0].split("#")[0];
          const fullAffiliateUrl = `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`;
          const shortAffiliateUrl = await this.shortenUrl(fullAffiliateUrl);
          const result: MirroredLinkResult = {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            fullAffiliateUrl,
            affiliateUrl: shortAffiliateUrl,
            productImageUrl,
            platform: "MERCADO_LIVRE",
          };
          resolvedCache.set(cleanRaw, result);
          return result;
        }

        const converted = this.convertUrl(finalUrl);
        const shortAffiliateUrl = await this.shortenUrl(converted.affiliateUrl);
        const result: MirroredLinkResult = {
          ...converted,
          originalUrl: rawUrl,
          affiliateUrl: shortAffiliateUrl,
          productImageUrl,
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }

      // Caso 3: Shopee
      if (finalUrl.includes("shopee.com") || finalUrl.includes("shope.ee")) {
        const cleanShopee = finalUrl.split("?")[0].split("#")[0];
        const fullAffiliateUrl = `${cleanShopee}?utm_source=${shopeeTag}&aff_sub=${shopeeTag}`;
        const shortAffiliateUrl = await this.shortenUrl(fullAffiliateUrl);
        const result: MirroredLinkResult = {
          originalUrl: rawUrl,
          resolvedUrl: cleanShopee,
          fullAffiliateUrl,
          affiliateUrl: shortAffiliateUrl,
          productImageUrl,
          platform: "SHOPEE",
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }

      // Caso 4: Amazon
      if (finalUrl.includes("amazon.com") || finalUrl.includes("amzn.to")) {
        const cleanAmazon = finalUrl.split("?")[0].split("#")[0];
        const fullAffiliateUrl = `${cleanAmazon}?tag=${amazonTag}`;
        const shortAffiliateUrl = await this.shortenUrl(fullAffiliateUrl);
        const result: MirroredLinkResult = {
          originalUrl: rawUrl,
          resolvedUrl: cleanAmazon,
          fullAffiliateUrl,
          affiliateUrl: shortAffiliateUrl,
          productImageUrl,
          platform: "AMAZON",
        };
        resolvedCache.set(cleanRaw, result);
        return result;
      }
    } catch {}

    const fallback = this.convertUrl(cleanRaw);
    const shortFallback = await this.shortenUrl(fallback.affiliateUrl);
    return {
      ...fallback,
      affiliateUrl: shortFallback,
    };
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
   * Desencurta links, extrai a foto real do produto, aplica a tag de afiliada da Nanda e encurta o link final!
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
