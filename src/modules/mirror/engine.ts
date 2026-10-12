export interface MirroredLinkResult {
  originalUrl: string;
  resolvedUrl?: string;
  affiliateUrl: string;
  platform: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON" | "MAGALU" | "OUTRO";
}

export class MirrorEngine {
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
      // Limpa parâmetros de afiliados concorrentes
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
          affiliateUrl: parsed.toString(),
          platform: "MERCADO_LIVRE",
        };
      } catch {
        const noQuery = base.split("?")[0];
        return {
          originalUrl: url,
          affiliateUrl: `${noQuery}?matt_tool=${tag}&matt_word=${tag}`,
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
      return {
        originalUrl: url,
        affiliateUrl: `${noQuery}?utm_source=${tag}&aff_sub=${tag}`,
        platform: "SHOPEE",
      };
    }

    // 3. Amazon
    if (low.includes("amazon.com") || low.includes("amzn.to") || low.includes("a.co")) {
      const tag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";
      const noQuery = clean.split("?")[0].split("#")[0];
      return {
        originalUrl: url,
        affiliateUrl: `${noQuery}?tag=${tag}`,
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
      return { originalUrl: url, affiliateUrl: updated, platform: "MAGALU" };
    }

    return { originalUrl: url, affiliateUrl: clean, platform: "OUTRO" };
  }

  /**
   * Desencurta links de concorrentes (meli.la, dailydoachadin, s.shopee.com.br, shope.ee, amzn.to)
   * extraindo a URL limpa do produto real e aplicando a tag de afiliada oficial da Nanda!
   */
  static async resolveAndConvertUrl(rawUrl: string): Promise<MirroredLinkResult> {
    const cleanRaw = rawUrl.trim();
    const mlTag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";
    const shopeeTag = process.env.SHOPEE_AFFILIATE_TAG || "achadosdananda-20";
    const amazonTag = process.env.AMAZON_ASSOCIATE_TAG || "achadosnanda-20";

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const res = await fetch(cleanRaw, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      let finalUrl = res.url || cleanRaw;
      const html = await res.text().catch(() => "");

      // Caso 1: Redirecionador intermediário caiu num link curto da Shopee (ex: dailydoachadin -> s.shopee.com.br)
      if (
        finalUrl.includes("s.shopee.com.br") ||
        finalUrl.includes("shope.ee")
      ) {
        try {
          const c2 = new AbortController();
          const t2 = setTimeout(() => c2.abort(), 4500);
          const r2 = await fetch(finalUrl, {
            redirect: "follow",
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: c2.signal,
          });
          clearTimeout(t2);
          if (r2.url && r2.url.includes("shopee.com.br")) {
            finalUrl = r2.url;
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
          html.match(/https?:\/\/[^"'<>\s]*mercadolivre\.com\.br\/[^"'<>\s]+/gi) || [];
        const productLink = allMlLinks.find(
          (u) =>
            (u.includes("/p/MLB") || u.includes("MLB-") || u.includes("/up/MLBU")) &&
            !u.includes("noindex") &&
            !u.includes("security.js")
        );

        if (productLink) {
          const cleanProductUrl = productLink
            .replace(/&amp;/g, "&")
            .split("?")[0]
            .split("#")[0];
          return {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            affiliateUrl: `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`,
            platform: "MERCADO_LIVRE",
          };
        }

        // Se a própria finalUrl já for de produto do ML
        if (finalUrl.includes("/p/MLB") || finalUrl.includes("MLB-")) {
          const cleanProductUrl = finalUrl.split("?")[0].split("#")[0];
          return {
            originalUrl: rawUrl,
            resolvedUrl: cleanProductUrl,
            affiliateUrl: `${cleanProductUrl}?matt_tool=${mlTag}&matt_word=${mlTag}`,
            platform: "MERCADO_LIVRE",
          };
        }

        // Se for social link do ML e não extraiu o /p/MLB, substitui matt_tool e matt_word na URL
        return this.convertUrl(finalUrl);
      }

      // Caso 3: Shopee
      if (finalUrl.includes("shopee.com") || finalUrl.includes("shope.ee")) {
        const cleanShopee = finalUrl.split("?")[0].split("#")[0];
        return {
          originalUrl: rawUrl,
          resolvedUrl: cleanShopee,
          affiliateUrl: `${cleanShopee}?utm_source=${shopeeTag}&aff_sub=${shopeeTag}`,
          platform: "SHOPEE",
        };
      }

      // Caso 4: Amazon
      if (finalUrl.includes("amazon.com") || finalUrl.includes("amzn.to")) {
        const cleanAmazon = finalUrl.split("?")[0].split("#")[0];
        return {
          originalUrl: rawUrl,
          resolvedUrl: cleanAmazon,
          affiliateUrl: `${cleanAmazon}?tag=${amazonTag}`,
          platform: "AMAZON",
        };
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
   * Modo CLONE Síncrono (rápido)
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
   * Desencurta links (meli.la, dailydoachadin, s.shopee.com.br, amzn.to) e troca APENAS o link pelo de afiliada da Nanda!
   */
  static async cloneMessageAsync(text: string): Promise<{
    clonedText: string;
    replacedLinks: MirroredLinkResult[];
  }> {
    if (!text) return { clonedText: "", replacedLinks: [] };

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = Array.from(text.matchAll(urlRegex));
    const replacedLinks: MirroredLinkResult[] = [];
    let clonedText = text;

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
      clonedText = clonedText.replace(
        fullMatch,
        resolved.affiliateUrl + trailingPunct
      );
    }

    clonedText = this.sanitizeCompetitorFooters(clonedText);
    return { clonedText, replacedLinks };
  }
}
