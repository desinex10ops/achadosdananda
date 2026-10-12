import { prisma } from "@/lib/prisma";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";

export type NicheSlug = "casa" | "moda" | "beleza" | "tech" | "ferramentas";

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
    id: "robo-casa",
    name: "Robô #01 • Casa & Cozinha",
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
    emoji: "🏠",
    description: "Garimpa Air Fryers, eletroportáteis, aspiradores, panelas, cama/mesa/banho e utilidades.",
    keywords: [
      "air fryer",
      "fritadeira",
      "aspirador",
      "panela",
      "liquidificador",
      "cozinha",
      "organizador",
      "lençol",
      "toalha",
      "cafeteira",
      "casa",
      "mop",
      "garrafa",
      "colchão",
      "travesseiro",
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
      "edredom",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-moda",
    name: "Robô #02 • Moda & Calçados",
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
    emoji: "👗",
    description: "Garimpa vestidos, camisas, conjuntos, tênis, calçados, bolsas e moda íntima.",
    keywords: [
      "vestido",
      "camisa",
      "camiseta",
      "calça",
      "tênis",
      "tenis",
      "sandália",
      "sandalia",
      "bolsa",
      "moletom",
      "blusa",
      "jaqueta",
      "polo",
      "linho",
      "moda",
      "feminino",
      "masculina",
      "masculino",
      "cueca",
      "calcinha",
      "meia",
      "sapato",
      "bota",
      "chinelo",
      "bermuda",
      "short",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-beleza",
    name: "Robô #03 • Beleza & Saúde",
    nicheSlug: "beleza",
    categoryName: "Beleza & Saúde",
    emoji: "💄",
    description: "Garimpa skincare, cremes, suplementos/whey, pranchas, secadores, perfumes e maquiagem.",
    keywords: [
      "nivea",
      "creme",
      "prancha",
      "chapinha",
      "secador",
      "escova",
      "maquiagem",
      "perfume",
      "hidratante",
      "shampoo",
      "facial",
      "protetor solar",
      "beleza",
      "batom",
      "sérum",
      "serum",
      "whey",
      "creatina",
      "suplemento",
      "vitamina",
      "colágeno",
      "colageno",
      "barbeador",
      "depilador",
      "desodorante",
      "fralda",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-tech",
    name: "Robô #04 • Eletrônicos & Tech",
    nicheSlug: "tech",
    categoryName: "Eletrônicos & Tech",
    emoji: "📱",
    description: "Garimpa fones Bluetooth, caixas de som, smartwatches, Smart TVs, celulares e notebooks.",
    keywords: [
      "fone",
      "bluetooth",
      "tws",
      "smartwatch",
      "relógio",
      "relogio",
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
      "carregador",
      "notebook",
      "tablet",
      "mouse",
      "teclado",
      "monitor",
      "console",
      "playstation",
      "camera",
      "câmera",
      "impressora",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-ferramentas",
    name: "Robô #05 • Ferramentas & Auto",
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
    emoji: "🛠️",
    description: "Garimpa parafusadeiras, furadeiras, maletas de ferramentas, pneus, lavadoras e auto.",
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
let LIVE_OFFERS_CACHE: {
  timestamp: number;
  items: Array<{
    itemId: string;
    title: string;
    originalPrice: number;
    currentPrice: number;
    discountPercentage: number;
    imageUrl: string;
    originalUrl: string;
    salesCountText: string;
    isFull: boolean;
    onPageCoupon: {
      label: string;
      discountType: "PERCENT" | "FIXED";
      discountValue: number;
    } | null;
  }>;
} | null = null;

export class MeliRobotArmyService {
  /**
   * Raspa AO VIVO a página oficial https://www.mercadolivre.com.br/ofertas
   * extraindo os cards reais do dia e os cupons nativos ativos no anúncio ("OFF com Cupom")
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

    const extractedItems: NonNullable<typeof LIVE_OFFERS_CACHE>["items"] = [];
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
          const cards = html.split("poly-card poly-card--grid-card").slice(1);

          for (const card of cards) {
            // 1. Imagem real do CDN mlstatic
            const imgMatch = card.match(/class=["']poly-component__picture["'][^>]*src=["']([^"']+)["']/i);
            const imageUrl = imgMatch ? imgMatch[1] : "";
            if (!imageUrl || !imageUrl.startsWith("http")) continue;

            // 2. Link e Título real do produto
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
              .trim();

            // 3. Preço anterior ("Antes: X reais com Y centavos")
            const prevMatch = card.match(
              /andes-money-amount--previous[^>]*aria-label=["']Antes:\s*(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?["']/i
            );
            let originalPrice = 0;
            if (prevMatch) {
              const reais = parseInt(prevMatch[1], 10);
              const cents = prevMatch[2] ? parseInt(prevMatch[2], 10) : 0;
              originalPrice = Number((reais + cents / 100).toFixed(2));
            }

            // 4. Preço atual da oferta
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

            // 5. Desconto %
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

            // 6. Vendas e selo FULL
            const soldMatch = card.match(/\|\s*(\+[\d.,]+(?:mil)?\s*vendidos)/i);
            const salesCountText = soldMatch ? soldMatch[1] : "Oferta do Dia";
            const isFull = card.includes("Enviado pelo FULL") || card.includes("poly_full");

            // 7. EXTRAÇÃO DE CUPOM REAL ATIVO NO ANÚNCIO DO MERCADO LIVRE (poly-coupons__pill)
            let onPageCoupon: {
              label: string;
              discountType: "PERCENT" | "FIXED";
              discountValue: number;
            } | null = null;

            if (card.includes("poly-coupons__pill")) {
              const couponBlock = card.split("poly-coupons__pill")[1]?.slice(0, 600) || "";
              const ariaMoney = couponBlock.match(/aria-label=["'](\d+)\s*reais/i);
              const pctText = couponBlock.match(/(\d+)\s*%\s*OFF\s*com\s*Cupom/i);
              const fracMoney = couponBlock.match(
                /andes-money-amount__fraction[^>]*>(\d+)<\/span>/i
              );

              if (pctText) {
                const val = parseInt(pctText[1], 10);
                onPageCoupon = {
                  label: `${val}% OFF no Anúncio`,
                  discountType: "PERCENT",
                  discountValue: val,
                };
              } else if (ariaMoney || fracMoney) {
                const val = parseInt((ariaMoney ? ariaMoney[1] : fracMoney![1]), 10);
                onPageCoupon = {
                  label: `R$ ${val} OFF no Anúncio`,
                  discountType: "FIXED",
                  discountValue: val,
                };
              }
            }

            const mlbId =
              MercadoLivreScraperService.extractMlbId(rawHref) ||
              `MLB${Math.floor(100000 + Math.random() * 900000)}`;

            extractedItems.push({
              itemId: mlbId,
              title,
              originalPrice,
              currentPrice,
              discountPercentage,
              imageUrl,
              originalUrl: rawHref,
              salesCountText,
              isFull,
              onPageCoupon,
            });
          }
        } catch (err) {
          console.warn("Aviso ao raspar página de ofertas do ML:", err);
        }
      })
    );

    if (extractedItems.length > 0) {
      LIVE_OFFERS_CACHE = {
        timestamp: Date.now(),
        items: extractedItems,
      };
    }

    return extractedItems;
  }

  /**
   * Classifica automaticamente o nicho de um produto pelo título e categoria
   */
  static classifyNiche(title: string, rawCategory?: string): {
    nicheSlug: NicheSlug;
    categoryName: string;
    robotId: string;
    robotName: string;
  } {
    const text = `${title || ""} ${rawCategory || ""}`.toLowerCase();

    for (const robot of MELI_NICHE_ROBOTS) {
      if (robot.keywords.some((kw) => text.includes(kw))) {
        return {
          nicheSlug: robot.nicheSlug,
          categoryName: robot.categoryName,
          robotId: robot.id,
          robotName: robot.name,
        };
      }
    }

    if (text.includes("moda") || text.includes("roupa") || text.includes("calçado")) {
      return {
        nicheSlug: "moda",
        categoryName: "Moda & Vestuário",
        robotId: "robo-moda",
        robotName: "Robô #02 • Moda & Calçados",
      };
    }
    if (text.includes("beleza") || text.includes("perfume") || text.includes("cabelo") || text.includes("saúde")) {
      return {
        nicheSlug: "beleza",
        categoryName: "Beleza & Saúde",
        robotId: "robo-beleza",
        robotName: "Robô #03 • Beleza & Saúde",
      };
    }
    if (text.includes("eletr") || text.includes("tech") || text.includes("inform") || text.includes("gamer")) {
      return {
        nicheSlug: "tech",
        categoryName: "Eletrônicos & Tech",
        robotId: "robo-tech",
        robotName: "Robô #04 • Eletrônicos & Tech",
      };
    }
    if (text.includes("ferramenta") || text.includes("auto") || text.includes("moto")) {
      return {
        nicheSlug: "ferramentas",
        categoryName: "Ferramentas",
        robotId: "robo-ferramentas",
        robotName: "Robô #05 • Ferramentas & Auto",
      };
    }

    return {
      nicheSlug: "casa",
      categoryName: "Casa & Cozinha",
      robotId: "robo-casa",
      robotName: "Robô #01 • Casa & Cozinha",
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
    if (catText.includes("casa") || catText.includes("cozinha")) nicheSlug = "casa";
    else if (catText.includes("moda") || catText.includes("roupa")) nicheSlug = "moda";
    else if (catText.includes("beleza") || catText.includes("saúde")) nicheSlug = "beleza";
    else if (catText.includes("eletr") || catText.includes("tech")) nicheSlug = "tech";
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
  static async runArmyScan(customUrls?: string[], forceRefresh = false): Promise<{
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

    // 2. Raspa AO VIVO as ofertas do dia no Mercado Livre (com detecção de "OFF com Cupom" real no anúncio)
    const liveScrapedOffers = await this.scrapeLiveMercadoLivreDailyOffers(forceRefresh);

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

    // Adiciona todas as ofertas reais raspadas ao vivo do Mercado Livre (/ofertas)
    // Priorizando no topo os produtos que têm Cupom Nativo Ativo no Anúncio!
    const sortedLive = [...liveScrapedOffers].sort((a, b) => {
      if (a.onPageCoupon && !b.onPageCoupon) return -1;
      if (!a.onPageCoupon && b.onPageCoupon) return 1;
      return b.discountPercentage - a.discountPercentage;
    });

    for (const liveItem of sortedLive) {
      rawItems.push({
        ...liveItem,
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

    // 3. Classifica por Nicho e calcula o preço final com o cupom real do anúncio + cupons cadastrados
    const seenTitles = new Set<string>();
    const deals: MatchedMeliDeal[] = [];
    const nicheSummary: Record<string, { count: number; withCouponCount: number }> = {
      casa: { count: 0, withCouponCount: 0 },
      moda: { count: 0, withCouponCount: 0 },
      beleza: { count: 0, withCouponCount: 0 },
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
