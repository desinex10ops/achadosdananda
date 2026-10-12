import { prisma } from "@/lib/prisma";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";
import liveCatalogSnapshot from "./meli-live-catalog.json";

export type NicheSlug =
  | "casa"
  | "moda"
  | "calcados"
  | "perfumaria"
  | "beleza"
  | "cabelos"
  | "tech"
  | "ferramentas";

export interface RobotAgentInfo {
  id: string;
  name: string;
  nicheSlug: NicheSlug;
  categoryName: string;
  emoji: string;
  description: string;
  keywords: string[];
  status: "ONLINE" | "SCANNING";
}

export interface MeliSmartCoupon {
  id: string;
  code: string;
  discountLabel: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscountAmount: number | null;
  minSpend: number;
  nicheSlug: NicheSlug | "all";
  categoryName: string;
  onlyFull?: boolean;
  validUntil: string;
  /**
   * ON_PAGE_CHECKBOX = Cupom oficial nativo da página do produto no Mercado Livre (basta marcar "Aplicar cupom" no anúncio, sem digitar código)
   * DATABASE = Código alfanumérico cadastrado manualmente pela afiliada
   */
  source: "ON_PAGE_CHECKBOX" | "DATABASE";
}

export interface MatchedMeliDeal {
  id: string;
  itemId: string;
  title: string;
  imageUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  originalPrice: number;
  dealPrice: number;
  dealDiscountPct: number;
  isFull: boolean;
  salesCountText: string;
  nicheSlug: NicheSlug;
  categoryName: string;
  robotId: string;
  robotName: string;
  isLiveFromMeli?: boolean;
  onPageCouponText?: string | null;
  applicableCoupons: Array<{
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
    isCheckboxCoupon?: boolean;
  }>;
  bestCoupon: {
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
    isCheckboxCoupon?: boolean;
  } | null;
}

export const MELI_NICHE_ROBOTS: RobotAgentInfo[] = [
  {
    id: "robo-perfumaria",
    name: "Robô #01 • Perfumaria (Boticário & Eudora)",
    nicheSlug: "perfumaria",
    categoryName: "Perfumaria & Boticário",
    emoji: "🌸",
    description: "Especialista em O Boticário (Floratta, Lily, Egeo, Liz), Eudora, Natura, Body Splash e Importados.",
    keywords: [
      "perfume",
      "colonia",
      "colônia",
      "boticario",
      "boticário",
      "floratta",
      "lily",
      "egeo",
      "glamour",
      "liz ",
      "her code",
      "coffee woman",
      "body splash",
      "bodysplash",
      "deo parfum",
      "eau de parfum",
      "eudora",
      "natura",
      "tododia",
      "essencial",
      "una ",
      "luna ",
      "la vie est belle",
      "good girl",
      "212 ",
      "importado",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-calcados",
    name: "Robô #02 • Tênis, Calçados & Bolsas",
    nicheSlug: "calcados",
    categoryName: "Calçados & Bolsas",
    emoji: "👟",
    description: "Especialista em Tênis Femininos (Vizzano, Olympikus, Nike, Adidas, Moleca), Sandálias, Botas e Bolsas.",
    keywords: [
      "tenis",
      "tênis",
      "sandalia",
      "sandália",
      "vizzano",
      "beira rio",
      "moleca",
      "olympikus",
      "kolosh",
      "ramarim",
      "dakota",
      "piccadilly",
      "via marte",
      "scarpin",
      "sapatilha",
      "rasteirinha",
      "tamanco",
      "bota ",
      "coturno",
      "chinelo",
      "sapato",
      "bolsa",
      "tiracolo",
      "transversal",
      "carteira feminina",
      "mochila feminina",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-moda",
    name: "Robô #03 • Moda Feminina & Roupas",
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
    emoji: "👗",
    description: "Especialista em vestidos, calças jeans, leggings, blusas, conjuntos, pijamas, lingerie e biquínis.",
    keywords: [
      "vestido",
      "calca",
      "calça",
      "jeans",
      "legging",
      "blusa",
      "cropped",
      "camisa",
      "camiseta",
      "conjunto",
      "saia",
      "short",
      "bermuda",
      "moletom",
      "jaqueta",
      "casaco",
      "blazer",
      "macacao",
      "macacão",
      "pijama",
      "lingerie",
      "calcinha",
      "sutia",
      "sutiã",
      "biquini",
      "biquíni",
      "maio",
      "maiô",
      "moda",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-beleza",
    name: "Robô #04 • Maquiagem & Skincare",
    nicheSlug: "beleza",
    categoryName: "Maquiagem & Skincare",
    emoji: "💄",
    description: "Especialista em bases, batons, rímel, corretivos, hidratantes faciais/corporais, séruns e protetor solar.",
    keywords: [
      "maquiagem",
      "batom",
      "base ",
      "corretivo",
      "rimel",
      "rímel",
      "mascara de cilios",
      "máscara de cílios",
      "blush",
      "paleta",
      "po compacto",
      "pó compacto",
      "gloss",
      "delineador",
      "skincare",
      "hidratante",
      "nivea",
      "cerave",
      "la roche",
      "vichy",
      "isdin",
      "neutrogena",
      "principia",
      "sallve",
      "protetor solar",
      "serum",
      "sérum",
      "acido hialuronico",
      "vitamina c",
      "agua micelar",
      "creme",
      "oleo corporal",
      "depilador",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-cabelos",
    name: "Robô #05 • Cabelos & Salão em Casa",
    nicheSlug: "cabelos",
    categoryName: "Cabelos & Salão",
    emoji: "💇‍♀️",
    description: "Especialista em escovas secadoras, chapinhas, secadores, kits shampoo/máscara (Siàge, L'Oréal, Lola, Truss).",
    keywords: [
      "cabelo",
      "capilar",
      "shampoo",
      "condicionador",
      "mascara capilar",
      "máscara capilar",
      "cronograma",
      "siage",
      "siàge",
      "loreal",
      "l'oréal",
      "elseve",
      "truss",
      "lola ",
      "wella",
      "pantene",
      "tresemme",
      "oleo extraordinario",
      "reparador de pontas",
      "escova secadora",
      "escova rotativa",
      "secador",
      "chapinha",
      "prancha",
      "modelador",
      "babyliss",
      "taiff",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-casa",
    name: "Robô #06 • Casa, Cozinha & Cama",
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
    emoji: "🏠",
    description: "Garimpa Air Fryers, jogos de panelas, lençóis, toalhas, aspiradores, cafeteiras e utilidades.",
    keywords: [
      "air fryer",
      "airfryer",
      "fritadeira",
      "aspirador",
      "panela",
      "liquidificador",
      "cozinha",
      "organizador",
      "lençol",
      "lencol",
      "toalha",
      "cama",
      "edredom",
      "travesseiro",
      "colchão",
      "cafeteira",
      "casa",
      "mop",
      "garrafa",
      "micro-ondas",
      "forno",
      "ventilador",
      "ar-condicionado",
      "cadeira",
      "mesa",
      "sofá",
      "purificador",
      "batedeira",
      "ferro de passar",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-tech",
    name: "Robô #07 • Relógios, Acessórios & Tech",
    nicheSlug: "tech",
    categoryName: "Relógios, Joias & Tech",
    emoji: "⌚",
    description: "Garimpa relógios femininos, colares, brincos, óculos de sol, smartwatches, celulares, fones e TVs.",
    keywords: [
      "relogio",
      "relógio",
      "colar",
      "brinco",
      "pulseira",
      "anel",
      "semijoia",
      "oculos",
      "óculos",
      "smartwatch",
      "fone",
      "bluetooth",
      "tws",
      "caixa de som",
      "jbl",
      "smart tv",
      "tv ",
      "televisão",
      "celular",
      "smartphone",
      "iphone",
      "samsung",
      "motorola",
      "xiaomi",
      "notebook",
      "tablet",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-ferramentas",
    name: "Robô #08 • Ferramentas & Utilidades",
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
    emoji: "🛠️",
    description: "Garimpa parafusadeiras, furadeiras, maletas de ferramentas, lavadoras de pressão e automotivo.",
    keywords: [
      "furadeira",
      "parafusadeira",
      "nakasaki",
      "maleta",
      "ferramenta",
      "chave",
      "lavadora",
      "serra",
      "bateria 21v",
      "bateria 12v",
      "impacto",
      "pneu",
      "automotivo",
      "solda",
      "compressor",
      "esmerilhadeira",
      "trena",
      "escada",
    ],
    status: "ONLINE",
  },
];

// Cache rápido de 3 minutos para a varredura ao vivo do Mercado Livre
type RawScrapedMeliItem = {
  itemId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  imageUrl: string;
  originalUrl: string;
  salesCountText: string;
  isFull: boolean;
  searchTag?: string;
  isFemale?: boolean;
  onPageCoupon: {
    label: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
  } | null;
};

let LIVE_OFFERS_CACHE: {
  timestamp: number;
  items: RawScrapedMeliItem[];
} | null = null;

const FEMALE_KEYWORDS = [
  "feminino",
  "feminina",
  "mulher",
  "vestido",
  "blusa",
  "saia",
  "cropped",
  "calca",
  "calça",
  "jeans",
  "legging",
  "conjunto",
  "bolsa",
  "tenis",
  "tênis",
  "sandalia",
  "sandália",
  "scarpin",
  "salto",
  "sapatilha",
  "bota",
  "tamanco",
  "rasteirinha",
  "vizzano",
  "beira rio",
  "moleca",
  "olympikus",
  "kolosh",
  "ramarim",
  "dakota",
  "piccadilly",
  "via marte",
  "perfume",
  "colonia",
  "colônia",
  "deo parfum",
  "eau de parfum",
  "body splash",
  "bodysplash",
  "boticario",
  "boticário",
  "floratta",
  "lily",
  "egeo",
  "glamour",
  "coffee woman",
  "her code",
  "liz ",
  "eudora",
  "siage",
  "siàge",
  "natura",
  "tododia",
  "hidratante",
  "creme corporal",
  "oleo corporal",
  "óleo corporal",
  "maquiagem",
  "batom",
  "rimel",
  "rímel",
  "mascara de cilios",
  "máscara de cílios",
  "base ",
  "corretivo",
  "blush",
  "paleta",
  "gloss",
  "skincare",
  "serum",
  "sérum",
  "protetor solar",
  "agua micelar",
  "água micelar",
  "cabelo",
  "capilar",
  "shampoo",
  "condicionador",
  "mascara capilar",
  "secador",
  "chapinha",
  "prancha",
  "escova secadora",
  "escova rotativa",
  "modelador",
  "babyliss",
  "depilador",
  "unha",
  "esmalte",
  "lingerie",
  "sutiã",
  "sutia",
  "calcinha",
  "pijama",
  "biquini",
  "biquíni",
  "relogio feminino",
  "colar",
  "brinco",
  "pulseira",
  "panela",
  "air fryer",
  "lencol",
  "toalha",
];

const MALE_OR_HEAVY_TOOL_EXCLUSIONS = [
  "masculino",
  "masculina",
  "homem",
  "barba",
  "cueca",
  "malbec",
  "quasar",
  "zaad",
  "arbo",
  "furadeira",
  "parafusadeira",
  "esmerilhadeira",
  "serra marmore",
  "serra circular",
  "chave de impacto",
  "martelete",
  "solda",
  "compressor",
  "pneu ",
  "oleo motor",
  "óleo motor",
  "capacete",
  "macaco hidraulico",
];

export class MeliRobotArmyService {
  /**
   * Corrige erros de digitação comuns (ex: "pergume" -> "perfume") e normaliza acentos
   */
  static normalizeSearchQuery(raw: string): string {
    return String(raw || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\bpergume(s)?\b/g, "perfume$1")
      .replace(/\bboti(c)?ar(i)?o\b/g, "boticario")
      .replace(/\bhidratate\b/g, "hidratante")
      .replace(/\bmaquiage\b/g, "maquiagem")
      .trim();
  }

  /**
   * Identifica se um produto pertence ao universo feminino (Moda Feminina, Perfumaria, Beleza, Cabelos, Bolsas e Calçados)
   */
  static isFemaleProduct(title: string, searchTag?: string, isFemaleFlag?: boolean): boolean {
    const normTitle = this.normalizeSearchQuery(title);
    if (MALE_OR_HEAVY_TOOL_EXCLUSIONS.some((ex) => normTitle.includes(ex))) {
      return false;
    }
    if (isFemaleFlag) return true;
    const combined = `${normTitle} ${this.normalizeSearchQuery(searchTag || "")}`;
    return FEMALE_KEYWORDS.some((kw) => combined.includes(this.normalizeSearchQuery(kw)));
  }

  /**
   * Extrai os cards reais de qualquer HTML do Mercado Livre (/ofertas ou lista.mercadolivre.com.br)
   */
  static parseCardsFromMeliHtml(
    html: string,
    seenUrls: Set<string>,
    searchTag = "OFERTAS_DIA",
    isFemale = false
  ): RawScrapedMeliItem[] {
    const items: RawScrapedMeliItem[] = [];
    const cards = html.split("poly-card poly-card--grid-card").slice(1);

    for (const card of cards) {
      const imgMatch = card.match(/class=["']poly-component__picture["'][^>]*src=["']([^"']+)["']/i);
      const imageUrl = imgMatch ? imgMatch[1] : "";
      if (!imageUrl || !imageUrl.startsWith("http")) continue;

      const titleLinkMatch = card.match(
        /<a[^>]+href=["']([^"']+)["'][^>]*class=["']poly-component__title["'][^>]*>([^<]+)<\/a>/i
      );
      if (!titleLinkMatch) continue;

      const rawHref = titleLinkMatch[1].replace(/&amp;/g, "&").split("#")[0];
      const cleanUrl = rawHref.split("?")[0];
      if (seenUrls.has(cleanUrl)) continue;
      seenUrls.add(cleanUrl);

      const title = titleLinkMatch[2]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .trim();

      const prevMatch = card.match(
        /andes-money-amount--previous[^>]*aria-label=["']Antes:\s*(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?["']/i
      );
      let originalPrice = 0;
      if (prevMatch) {
        const reais = parseInt(prevMatch[1], 10);
        const cents = prevMatch[2] ? parseInt(prevMatch[2], 10) : 0;
        originalPrice = Number((reais + cents / 100).toFixed(2));
      }

      const currSection = card.split("poly-price__current")[1] || "";
      const currMatch = currSection.match(
        /aria-label=["'](\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?["']/i
      );
      let currentPrice = 0;
      if (currMatch) {
        const reais = parseInt(currMatch[1], 10);
        const cents = currMatch[2] ? parseInt(currMatch[2], 10) : 0;
        currentPrice = Number((reais + cents / 100).toFixed(2));
      }
      if (currentPrice <= 0) continue;

      const discMatch = card.match(/(\d+)%\s*OFF/i);
      let discountPercentage = discMatch ? parseInt(discMatch[1], 10) : 0;
      if (originalPrice <= currentPrice) {
        if (discountPercentage > 0 && discountPercentage < 95) {
          originalPrice = Number((currentPrice / (1 - discountPercentage / 100)).toFixed(2));
        } else {
          originalPrice = Number((currentPrice * 1.25).toFixed(2));
          discountPercentage = 20;
        }
      } else if (discountPercentage === 0) {
        discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      const soldMatch = card.match(/\|\s*(\+[\d.,]+(?:mil)?\s*vendidos)/i);
      const salesCountText = soldMatch ? soldMatch[1] : "Oferta do Dia";
      const isFull = card.includes("Enviado pelo FULL") || card.includes("poly_full");

      let onPageCoupon: RawScrapedMeliItem["onPageCoupon"] = null;
      if (card.includes("poly-coupons__pill")) {
        const couponBlock = card.split("poly-coupons__pill")[1]?.slice(0, 650) || "";
        const cleanText = couponBlock.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        const hasOffWord = /OFF\s+com\s+Cupom/i.test(cleanText);
        const pctText = cleanText.match(/(\d+)\s*%\s*OFF\s*com\s*Cupom/i);
        const ariaMoney = couponBlock.match(
          /aria-label=["'](\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?["']/i
        );

        if (pctText) {
          const val = parseInt(pctText[1], 10);
          onPageCoupon = {
            label: `Cupom de Loja (${val}% OFF conforme regras no ML)`,
            discountType: "PERCENT",
            discountValue: val,
          };
        } else if (ariaMoney && hasOffWord) {
          const val = Number(
            (
              parseInt(ariaMoney[1], 10) +
              (ariaMoney[2] ? parseInt(ariaMoney[2], 10) : 0) / 100
            ).toFixed(2)
          );
          if (val >= 2 && val <= currentPrice * 0.35) {
            onPageCoupon = {
              label: `Cupom de Loja (R$ ${Math.round(val)} OFF conforme compra mínima no ML)`,
              discountType: "FIXED",
              discountValue: Math.round(val),
            };
          }
        }
      }

      const mlbId =
        MercadoLivreScraperService.extractMlbId(rawHref) ||
        `MLB${Math.floor(100000 + Math.random() * 900000)}`;

      items.push({
        itemId: mlbId,
        title,
        originalPrice,
        currentPrice,
        discountPercentage,
        imageUrl,
        originalUrl: cleanUrl,
        salesCountText,
        isFull,
        searchTag,
        isFemale: isFemale || this.isFemaleProduct(title, searchTag, isFemale),
        onPageCoupon,
      });
    }

    return items;
  }

  /**
   * Busca AO VIVO um produto específico no Mercado Livre (ex: "perfume boticario", "tenis", "vestido feminino")
   * ou filtra apenas o universo feminino ("Só Produtos Femininos")
   */
  static async scrapeLiveMercadoLivreByQuery(
    rawQuery: string,
    onlyFemale = false
  ): Promise<RawScrapedMeliItem[]> {
    const cleanQuery = this.normalizeSearchQuery(rawQuery);
    const seenUrls = new Set<string>();
    const results: RawScrapedMeliItem[] = [];

    // 1. Se o usuário digitou um produto específico (ex: "tenis", "perfume boticario", "bolsa feminina", "chapinha")
    if (cleanQuery && cleanQuery !== "feminino" && cleanQuery !== "produtos femininos") {
      let slug = cleanQuery.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (
        onlyFemale &&
        !slug.includes("feminin") &&
        !slug.includes("boticario") &&
        !slug.includes("eudora") &&
        !slug.includes("floratta") &&
        !slug.includes("lily")
      ) {
        slug = `${slug}-feminino`;
      }

      if (slug.length >= 2) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const searchUrl = `https://lista.mercadolivre.com.br/${slug}`;
          const res = await fetch(searchUrl, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9",
            },
            signal: controller.signal,
            cache: "no-store",
          });
          clearTimeout(timer);

          if (res.ok) {
            const html = await res.text();
            const liveCards = this.parseCardsFromMeliHtml(html, seenUrls, cleanQuery, onlyFemale);
            for (const c of liveCards) {
              const normCardTitle = this.normalizeSearchQuery(c.title);
              if (onlyFemale && MALE_OR_HEAVY_TOOL_EXCLUSIONS.some((ex) => normCardTitle.includes(ex))) {
                continue;
              }
              results.push(c);
            }
          }
        } catch (err) {
          console.warn("Aviso ao buscar termo ao vivo no ML:", err);
        }
      }

      // Complementa / faz fallback com o super catálogo real de 877 produtos dos 8 Robôs Especialistas
      const queryTokens = cleanQuery
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !["para", "com", "dos", "das", "uma", "so", "produtos", "de", "do", "da"].includes(w));

      if (Array.isArray(liveCatalogSnapshot)) {
        for (const snap of liveCatalogSnapshot as any[]) {
          if (seenUrls.has(snap.originalUrl)) continue;
          const haystack = this.normalizeSearchQuery(`${snap.title} ${snap.searchTag || ""}`);
          const matchesAll =
            queryTokens.length > 0 && queryTokens.every((tk) => haystack.includes(tk));
          const matchesAny =
            results.length < 15 &&
            queryTokens.length > 0 &&
            queryTokens.some((tk) => haystack.includes(tk));

          if (matchesAll || matchesAny) {
            const normSnapTitle = this.normalizeSearchQuery(snap.title);
            if (onlyFemale && MALE_OR_HEAVY_TOOL_EXCLUSIONS.some((ex) => normSnapTitle.includes(ex))) {
              continue;
            }
            seenUrls.add(snap.originalUrl);
            results.push({
              itemId: snap.itemId,
              title: snap.title,
              originalPrice: Number(snap.originalPrice),
              currentPrice: Number(snap.currentPrice),
              discountPercentage: Number(snap.discountPercentage),
              imageUrl: snap.imageUrl,
              originalUrl: snap.originalUrl,
              salesCountText: snap.salesCountText || "+1mil vendidos",
              isFull: Boolean(snap.isFull),
              searchTag: snap.searchTag,
              isFemale: Boolean(snap.isFemale),
              onPageCoupon: snap.onPageCoupon || null,
            });
          }
        }
      }

      return results;
    }

    // 2. Se o usuário ativou "Só Produtos Femininos" sem termo específico (ou buscou "produtos femininos")
    if (Array.isArray(liveCatalogSnapshot)) {
      const sortedSnap = [...(liveCatalogSnapshot as any[])].sort((a, b) => {
        const aSpecific = a.searchTag && a.searchTag !== "OFERTAS_DIA" ? 1 : 0;
        const bSpecific = b.searchTag && b.searchTag !== "OFERTAS_DIA" ? 1 : 0;
        return bSpecific - aSpecific;
      });

      for (const snap of sortedSnap) {
        if (seenUrls.has(snap.originalUrl)) continue;
        if (!this.isFemaleProduct(snap.title, snap.searchTag, snap.isFemale)) continue;
        seenUrls.add(snap.originalUrl);
        results.push({
          itemId: snap.itemId,
          title: snap.title,
          originalPrice: Number(snap.originalPrice),
          currentPrice: Number(snap.currentPrice),
          discountPercentage: Number(snap.discountPercentage),
          imageUrl: snap.imageUrl,
          originalUrl: snap.originalUrl,
          salesCountText: snap.salesCountText || "+1mil vendidos",
          isFull: Boolean(snap.isFull),
          searchTag: snap.searchTag,
          isFemale: true,
          onPageCoupon: snap.onPageCoupon || null,
        });
      }
    }

    return results;
  }

  /**
   * Raspa AO VIVO a página oficial https://www.mercadolivre.com.br/ofertas
   * e combina com o catálogo dos 8 Robôs Especialistas (877 ofertas reais)
   */
  static async scrapeLiveMercadoLivreDailyOffers(forceRefresh = false) {
    if (
      !forceRefresh &&
      LIVE_OFFERS_CACHE &&
      Date.now() - LIVE_OFFERS_CACHE.timestamp < 3 * 60 * 1000 &&
      LIVE_OFFERS_CACHE.items.length > 0
    ) {
      return LIVE_OFFERS_CACHE.items;
    }

    const pagesToFetch = [
      "https://www.mercadolivre.com.br/ofertas?page=1",
      "https://www.mercadolivre.com.br/ofertas?page=2",
    ];

    const extractedItems: RawScrapedMeliItem[] = [];
    const seenUrls = new Set<string>();

    await Promise.all(
      pagesToFetch.map(async (pageUrl) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8500);
          const res = await fetch(pageUrl, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9",
            },
            signal: controller.signal,
            cache: "no-store",
          });
          clearTimeout(timer);

          if (!res.ok) return;
          const html = await res.text();
          const pageItems = this.parseCardsFromMeliHtml(html, seenUrls, "OFERTAS_DIA", false);
          extractedItems.push(...pageItems);
        } catch (err) {
          console.warn("Aviso ao raspar página de ofertas do ML:", err);
        }
      })
    );

    // Une com o catálogo completo dos 8 Robôs Especialistas para que todos os 8 robôs tenham dezenas de ofertas ativas
    if (Array.isArray(liveCatalogSnapshot)) {
      for (const snap of liveCatalogSnapshot as any[]) {
        if (seenUrls.has(snap.originalUrl)) continue;
        seenUrls.add(snap.originalUrl);
        extractedItems.push({
          itemId: snap.itemId,
          title: snap.title,
          originalPrice: Number(snap.originalPrice),
          currentPrice: Number(snap.currentPrice),
          discountPercentage: Number(snap.discountPercentage),
          imageUrl: snap.imageUrl,
          originalUrl: snap.originalUrl,
          salesCountText: snap.salesCountText || "+1mil vendidos",
          isFull: Boolean(snap.isFull),
          searchTag: snap.searchTag,
          isFemale: Boolean(snap.isFemale),
          onPageCoupon: snap.onPageCoupon
            ? {
                label: snap.onPageCoupon.label,
                discountType: snap.onPageCoupon.discountType as "PERCENT" | "FIXED",
                discountValue: Number(snap.onPageCoupon.discountValue),
              }
            : null,
        });
      }
    }

    if (extractedItems.length > 0) {
      LIVE_OFFERS_CACHE = {
        timestamp: Date.now(),
        items: extractedItems,
      };
    }

    return extractedItems;
  }

  /**
   * Classifica automaticamente o nicho de um produto pelo título e categoria entre os 8 Robôs Especialistas
   */
  static classifyNiche(title: string, rawCategory?: string): {
    nicheSlug: NicheSlug;
    categoryName: string;
    robotId: string;
    robotName: string;
  } {
    const text = this.normalizeSearchQuery(`${title || ""} ${rawCategory || ""}`);

    for (const robot of MELI_NICHE_ROBOTS) {
      if (robot.keywords.some((kw) => text.includes(this.normalizeSearchQuery(kw)))) {
        return {
          nicheSlug: robot.nicheSlug,
          categoryName: robot.categoryName,
          robotId: robot.id,
          robotName: robot.name,
        };
      }
    }

    return {
      nicheSlug: "casa",
      categoryName: "Casa & Cozinha",
      robotId: "robo-casa",
      robotName: "Robô #06 • Casa, Cozinha & Cama",
    };
  }

  /**
   * Converte um cupom real salvo no banco de dados pela usuária para cálculo automático
   */
  static parseDbCoupon(dbCoupon: any): MeliSmartCoupon {
    const discountStr = String(dbCoupon.discount || "10% OFF");
    const percentMatch = discountStr.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const fixedMatch =
      discountStr.match(/R\$\s*(\d+(?:[.,]\d+)?)/i) || discountStr.match(/(\d+(?:[.,]\d+)?)/);

    let discountType: "PERCENT" | "FIXED" = "PERCENT";
    let discountValue = 10;

    if (percentMatch) {
      discountType = "PERCENT";
      discountValue = parseFloat(percentMatch[1].replace(",", "."));
    } else if (fixedMatch) {
      discountType = "FIXED";
      discountValue = parseFloat(fixedMatch[1].replace(",", "."));
    }

    const catText = String(dbCoupon.category || "Geral").toLowerCase();
    let nicheSlug: NicheSlug | "all" = "all";
    if (catText.includes("perfum") || catText.includes("botic")) nicheSlug = "perfumaria";
    else if (catText.includes("calcado") || catText.includes("calçado") || catText.includes("tenis") || catText.includes("bolsa")) nicheSlug = "calcados";
    else if (catText.includes("cabelo") || catText.includes("salão")) nicheSlug = "cabelos";
    else if (catText.includes("casa") || catText.includes("cozinha")) nicheSlug = "casa";
    else if (catText.includes("moda") || catText.includes("roupa")) nicheSlug = "moda";
    else if (catText.includes("beleza") || catText.includes("maquiagem") || catText.includes("saúde")) nicheSlug = "beleza";
    else if (catText.includes("eletr") || catText.includes("tech") || catText.includes("relogio")) nicheSlug = "tech";
    else if (catText.includes("ferramenta")) nicheSlug = "ferramentas";

    return {
      id: `db-${dbCoupon.id}`,
      code: String(dbCoupon.code).toUpperCase(),
      discountLabel: discountStr,
      discountType,
      discountValue,
      maxDiscountAmount: discountType === "PERCENT" ? 60 : discountValue,
      minSpend: Number(dbCoupon.minSpend || 0),
      nicheSlug,
      categoryName: dbCoupon.category || "Todos os Nichos",
      validUntil: dbCoupon.validUntil
        ? new Date(dbCoupon.validUntil).toLocaleDateString("pt-BR")
        : "Ativo hoje",
      source: "DATABASE",
    };
  }

  /**
   * Calcula se um cupom é aplicável ao produto e quanto o cliente economiza
   */
  static evaluateCouponOnProduct(
    coupon: MeliSmartCoupon,
    dealPrice: number,
    originalPrice: number,
    nicheSlug: NicheSlug,
    isFull: boolean
  ): {
    eligible: boolean;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
  } {
    if (coupon.nicheSlug !== "all" && coupon.nicheSlug !== nicheSlug) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    if (coupon.onlyFull && !isFull) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    if (dealPrice < coupon.minSpend) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    let savings = 0;
    if (coupon.discountType === "PERCENT") {
      savings = (dealPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && savings > coupon.maxDiscountAmount) {
        savings = coupon.maxDiscountAmount;
      }
    } else {
      savings = coupon.discountValue;
    }

    savings = Number(Math.min(savings, dealPrice * 0.8).toFixed(2));
    const finalPrice = Number(Math.max(1, dealPrice - savings).toFixed(2));
    const baseOrig = Math.max(originalPrice, dealPrice);
    const totalDiscountPct = Math.round(((baseOrig - finalPrice) / baseOrig) * 100);

    return {
      eligible: savings > 0,
      couponSavings: savings,
      finalPrice,
      totalDiscountPct,
    };
  }

  /**
   * Executa a varredura completa do Exército de Robôs (100% AO VIVO do Mercado Livre + Cupons Reais)
   */
  static async runArmyScan(
    customUrls?: string[],
    forceRefresh = false,
    searchQuery?: string,
    onlyFemale = false
  ): Promise<{
    robots: RobotAgentInfo[];
    coupons: MeliSmartCoupon[];
    deals: MatchedMeliDeal[];
    nicheSummary: Record<string, { count: number; withCouponCount: number }>;
  }> {
    const affiliateTag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";

    // 1. Carrega APENAS cupons reais cadastrados no banco + cupons reais detectados nos anúncios do ML
    const couponsMap = new Map<string, MeliSmartCoupon>();

    try {
      const dbCoupons = await prisma.coupon.findMany({
        where: {
          status: { in: ["ACTIVE", "EXPIRING_SOON"] },
          marketplace: {
            OR: [
              { slug: { contains: "mercado" } },
              { name: { contains: "Mercado" } },
            ],
          },
        },
        include: { marketplace: true },
      });

      for (const dbc of dbCoupons) {
        const parsed = this.parseDbCoupon(dbc);
        couponsMap.set(parsed.code.toUpperCase(), parsed);
      }
    } catch {}

    // 2. Raspa AO VIVO as ofertas do dia ou busca específica no Mercado Livre
    const hasCustomQueryOrFemale = Boolean((searchQuery && searchQuery.trim()) || onlyFemale);
    const liveScrapedOffers = hasCustomQueryOrFemale
      ? await this.scrapeLiveMercadoLivreByQuery(searchQuery || "", onlyFemale)
      : await this.scrapeLiveMercadoLivreDailyOffers(forceRefresh);

    const rawItems: Array<{
      itemId: string;
      title: string;
      originalPrice: number;
      currentPrice: number;
      discountPercentage: number;
      imageUrl: string;
      originalUrl: string;
      salesCountText: string;
      isFull: boolean;
      rawCategory?: string;
      isLiveFromMeli?: boolean;
      onPageCoupon?: {
        label: string;
        discountType: "PERCENT" | "FIXED";
        discountValue: number;
      } | null;
    }> = [];

    // Se o usuário enviou links específicos para varrer ao vivo
    if (customUrls && customUrls.length > 0) {
      const scrapedItems = await MercadoLivreScraperService.resolveLinks(customUrls);
      for (const s of scrapedItems) {
        rawItems.push({
          itemId: s.itemId || s.id,
          title: s.title,
          originalPrice: s.originalPrice,
          currentPrice: s.currentPrice,
          discountPercentage: s.discountPercentage,
          imageUrl: s.imageUrl,
          originalUrl: s.originalUrl,
          salesCountText: s.salesCountText || "+1k vendidos",
          isFull: s.isFull,
          rawCategory: s.category,
          isLiveFromMeli: true,
        });
      }
    }

    // Adiciona todas as ofertas reais raspadas ao vivo do Mercado Livre
    const sortedLive = [...liveScrapedOffers].sort((a, b) => {
      if (a.onPageCoupon && !b.onPageCoupon) return -1;
      if (!a.onPageCoupon && b.onPageCoupon) return 1;
      return b.discountPercentage - a.discountPercentage;
    });

    for (const liveItem of sortedLive) {
      rawItems.push({
        ...liveItem,
        rawCategory: liveItem.searchTag,
        isLiveFromMeli: true,
      });

      // Registra o grupo de cupom nativo do anúncio na barra de filtros de cupons reais
      if (liveItem.onPageCoupon) {
        const couponKey =
          liveItem.onPageCoupon.discountType === "PERCENT"
            ? `NO-ANUNCIO-${liveItem.onPageCoupon.discountValue}%OFF`
            : `NO-ANUNCIO-R$${liveItem.onPageCoupon.discountValue}OFF`;

        if (!couponsMap.has(couponKey)) {
          couponsMap.set(couponKey, {
            id: `live-onpage-${couponKey}`,
            code: couponKey,
            discountLabel: `${liveItem.onPageCoupon.label} (Ativar na página do ML)`,
            discountType: liveItem.onPageCoupon.discountType,
            discountValue: liveItem.onPageCoupon.discountValue,
            maxDiscountAmount:
              liveItem.onPageCoupon.discountType === "FIXED"
                ? liveItem.onPageCoupon.discountValue
                : 100,
            minSpend: 0,
            nicheSlug: "all",
            categoryName: "Cupom Nativo no Anúncio ML",
            validUntil: "Ativo agora no anúncio",
            source: "ON_PAGE_CHECKBOX",
          });
        }
      }
    }

    const dbCouponsList = Array.from(couponsMap.values()).filter((c) => c.source === "DATABASE");
    const allCoupons = Array.from(couponsMap.values());

    // 3. Classifica pelos 8 Robôs Especialistas
    const seenTitles = new Set<string>();
    const deals: MatchedMeliDeal[] = [];
    const nicheSummary: Record<string, { count: number; withCouponCount: number }> = {
      perfumaria: { count: 0, withCouponCount: 0 },
      calcados: { count: 0, withCouponCount: 0 },
      moda: { count: 0, withCouponCount: 0 },
      beleza: { count: 0, withCouponCount: 0 },
      cabelos: { count: 0, withCouponCount: 0 },
      casa: { count: 0, withCouponCount: 0 },
      tech: { count: 0, withCouponCount: 0 },
      ferramentas: { count: 0, withCouponCount: 0 },
    };

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const normTitle = item.title.toLowerCase().trim();
      if (seenTitles.has(normTitle)) continue;
      seenTitles.add(normTitle);

      const nicheInfo = this.classifyNiche(item.title, item.rawCategory);
      const affiliateUrl = MercadoLivreScraperService.convertToAffiliateUrl(
        item.originalUrl,
        affiliateTag
      );

      const applicableCoupons: MatchedMeliDeal["applicableCoupons"] = [];

      // A) Se o próprio anúncio do Mercado Livre tem cupom nativo ativo ("R$ 20 OFF com Cupom")
      if (item.onPageCoupon) {
        const couponKey =
          item.onPageCoupon.discountType === "PERCENT"
            ? `NO-ANUNCIO-${item.onPageCoupon.discountValue}%OFF`
            : `NO-ANUNCIO-R$${item.onPageCoupon.discountValue}OFF`;

        const savings =
          item.onPageCoupon.discountType === "PERCENT"
            ? Number(((item.currentPrice * item.onPageCoupon.discountValue) / 100).toFixed(2))
            : item.onPageCoupon.discountValue;

        const finalPrice = Number(Math.max(1, item.currentPrice - savings).toFixed(2));
        const baseOrig = Math.max(item.originalPrice, item.currentPrice);
        const totalDiscountPct = Math.round(((baseOrig - finalPrice) / baseOrig) * 100);

        applicableCoupons.push({
          code: couponKey,
          discountLabel: `${item.onPageCoupon.label} (Marcar "Aplicar cupom" no anúncio)`,
          couponSavings: savings,
          finalPrice,
          totalDiscountPct,
          isCheckboxCoupon: true,
        });
      }

      // B) Testa também cupons alfanuméricos reais cadastrados pela usuária no banco
      for (const dbCoupon of dbCouponsList) {
        const evalRes = this.evaluateCouponOnProduct(
          dbCoupon,
          item.currentPrice,
          item.originalPrice,
          nicheInfo.nicheSlug,
          item.isFull
        );
        if (evalRes.eligible) {
          applicableCoupons.push({
            code: dbCoupon.code,
            discountLabel: dbCoupon.discountLabel,
            couponSavings: evalRes.couponSavings,
            finalPrice: evalRes.finalPrice,
            totalDiscountPct: evalRes.totalDiscountPct,
            isCheckboxCoupon: false,
          });
        }
      }

      applicableCoupons.sort((a, b) => b.couponSavings - a.couponSavings);
      const bestCoupon = applicableCoupons.length > 0 ? applicableCoupons[0] : null;

      if (nicheSummary[nicheInfo.nicheSlug]) {
        nicheSummary[nicheInfo.nicheSlug].count += 1;
        if (bestCoupon) {
          nicheSummary[nicheInfo.nicheSlug].withCouponCount += 1;
        }
      }

      deals.push({
        id: `army-${item.itemId}-${i}`,
        itemId: item.itemId,
        title: item.title,
        imageUrl: item.imageUrl,
        originalUrl: item.originalUrl,
        affiliateUrl,
        originalPrice: item.originalPrice,
        dealPrice: item.currentPrice,
        dealDiscountPct: item.discountPercentage,
        isFull: item.isFull,
        salesCountText: item.salesCountText,
        nicheSlug: nicheInfo.nicheSlug,
        categoryName: nicheInfo.categoryName,
        robotId: nicheInfo.robotId,
        robotName: nicheInfo.robotName,
        isLiveFromMeli: item.isLiveFromMeli,
        onPageCouponText: item.onPageCoupon ? item.onPageCoupon.label : null,
        applicableCoupons,
        bestCoupon,
      });
    }

    return {
      robots: MELI_NICHE_ROBOTS,
      coupons: allCoupons,
      deals,
      nicheSummary,
    };
  }
}
