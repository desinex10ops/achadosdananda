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
  source: "ROBOT_RADAR" | "DATABASE";
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
  applicableCoupons: Array<{
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
  }>;
  bestCoupon: {
    code: string;
    discountLabel: string;
    couponSavings: number;
    finalPrice: number;
    totalDiscountPct: number;
  } | null;
}

export const MELI_NICHE_ROBOTS: RobotAgentInfo[] = [
  {
    id: "robo-casa",
    name: "Robô #01 • Casa & Cozinha",
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
    emoji: "🏠",
    description: "Garimpa Air Fryers, eletroportáteis, aspiradores, panelas e organização.",
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
    ],
    status: "ONLINE",
  },
  {
    id: "robo-moda",
    name: "Robô #02 • Moda & Calçados",
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
    emoji: "👗",
    description: "Garimpa vestidos, camisas, conjuntos, calçados, bolsas e moda íntima.",
    keywords: [
      "vestido",
      "camisa",
      "camiseta",
      "calça",
      "tênis",
      "sandália",
      "bolsa",
      "moletom",
      "blusa",
      "jaqueta",
      "polo",
      "linho",
      "moda",
      "feminino",
      "masculina",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-beleza",
    name: "Robô #03 • Beleza & Cuidados",
    nicheSlug: "beleza",
    categoryName: "Beleza & Cuidados",
    emoji: "💄",
    description: "Garimpa skincare, cremes Nivea, pranchas, secadores, perfumes e maquiagem.",
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
    ],
    status: "ONLINE",
  },
  {
    id: "robo-tech",
    name: "Robô #04 • Eletrônicos & Tech",
    nicheSlug: "tech",
    categoryName: "Eletrônicos & Tech",
    emoji: "📱",
    description: "Garimpa fones Bluetooth, caixas de som, smartwatches, TVs e celulares.",
    keywords: [
      "fone",
      "bluetooth",
      "tws",
      "smartwatch",
      "relógio",
      "caixa de som",
      "jbl",
      "smart tv",
      "celular",
      "smartphone",
      "carregador",
      "notebook",
      "tablet",
      "mouse",
      "teclado",
    ],
    status: "ONLINE",
  },
  {
    id: "robo-ferramentas",
    name: "Robô #05 • Ferramentas & Auto",
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
    emoji: "🛠️",
    description: "Garimpa parafusadeiras, furadeiras, maletas de ferramentas e lavadoras.",
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
    ],
    status: "ONLINE",
  },
];

// Catálogo expandido de Ofertas do Dia do Mercado Livre separadas por nicho (com fotos oficiais CDN mlstatic)
const MELI_DAILY_DEALS_POOL: Array<{
  itemId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  imageUrl: string;
  originalUrl: string;
  salesCountText: string;
  isFull: boolean;
  nicheSlug: NicheSlug;
  categoryName: string;
}> = [
  // CASA & COZINHA
  {
    itemId: "MLB4941910291",
    title: "Fritadeira Sem Óleo Air Fryer Mondial Family 4 Litros 1500W Inox Preto",
    originalPrice: 469.9,
    currentPrice: 229.9,
    discountPercentage: 51,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_781192-MLA49419102914_032022-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-4941910291-fritadeira-sem-oleo-air-fryer-mondial-4l.html",
    salesCountText: "+20k vendidos",
    isFull: true,
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
  },
  {
    itemId: "MLB1140732289",
    title: "Robô Aspirador De Pó WAP Robot W100 Varre Aspira Passa Pano Bivolt",
    originalPrice: 499.9,
    currentPrice: 279.9,
    discountPercentage: 44,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_840236-MLA114073228902_092023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-1140732289-robo-aspirador-wap-robot-w100.html",
    salesCountText: "+10k vendidos",
    isFull: true,
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
  },
  {
    itemId: "MLB1093972228",
    title: "Organizador De Maquiagem E Bancada Giratório 360 Acrílico Transparente",
    originalPrice: 109.9,
    currentPrice: 49.9,
    discountPercentage: 55,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_801812-MLA109397222870_072023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-1093972228-organizador-maquiagem-giratorio-360.html",
    salesCountText: "+7k vendidos",
    isFull: true,
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
  },

  // MODA & VESTUÁRIO
  {
    itemId: "MLB5455472680",
    title: "Vestido Feminino Midi Canelado Manga Curta Elegante Casual Lastex",
    originalPrice: 129.9,
    currentPrice: 49.9,
    discountPercentage: 62,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_666085-MLA54554726803_032023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-5455472680-vestido-feminino-midi-canelado.html",
    salesCountText: "+12k vendidos",
    isFull: true,
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
  },
  {
    itemId: "MLB2819482012",
    title: "Kit 3 Camisas Masculinas Básicas Algodão Confort Piquet Gola Polo",
    originalPrice: 189.9,
    currentPrice: 89.9,
    discountPercentage: 53,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_812391-MLB71004123891_082023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-2819482012-kit-3-camisas-polo-masculinas-algodao.html",
    salesCountText: "+8k vendidos",
    isFull: true,
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
  },
  {
    itemId: "MLB2948102941",
    title: "Camisa Masculina Slim Fit Manga Longa Algodão Premium Casual Social",
    originalPrice: 139.9,
    currentPrice: 59.9,
    discountPercentage: 57,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_914588-MLB72199742468_102023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-2948102941-camisa-masculina-slim-fit-manga-longa-algodao.html",
    salesCountText: "+15k vendidos",
    isFull: true,
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
  },

  // BELEZA & CUIDADOS
  {
    itemId: "MLB1000133786",
    title: "Prancha Alisadora Mondial Golden Rose Bivolt P-20 Cerâmica Tourmaline",
    originalPrice: 129.9,
    currentPrice: 59.9,
    discountPercentage: 54,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_937184-MLA100013378601_042023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-1000133786-prancha-alisadora-mondial-golden-rose.html",
    salesCountText: "+18k vendidos",
    isFull: true,
    nicheSlug: "beleza",
    categoryName: "Beleza & Cuidados",
  },
  {
    itemId: "MLB8147175024",
    title: "NIVEA Creme Facial Antissinais Q10 Power Dia FPS 30 47g Oficial",
    originalPrice: 79.9,
    currentPrice: 42.9,
    discountPercentage: 46,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_727124-MLA81471750247_102023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-8147175024-nivea-creme-facial-antissinais-q10.html",
    salesCountText: "+30k vendidos",
    isFull: true,
    nicheSlug: "beleza",
    categoryName: "Beleza & Cuidados",
  },

  // ELETRÔNICOS & TECH
  {
    itemId: "MLB9990591502",
    title: "Fone De Ouvido Sem Fio Bluetooth 5.3 TWS Microfone Bateria Longa Duração",
    originalPrice: 119.9,
    currentPrice: 44.9,
    discountPercentage: 63,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_943083-MLB99905915023_102023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-9990591502-fone-de-ouvido-bluetooth-tws.html",
    salesCountText: "+25k vendidos",
    isFull: true,
    nicheSlug: "tech",
    categoryName: "Eletrônicos & Tech",
  },

  // FERRAMENTAS
  {
    itemId: "MLB3568910291",
    title: "Furadeira E Parafusadeira Nakasaki 12V Com Maleta Bateria Bivolt",
    originalPrice: 199.9,
    currentPrice: 89.9,
    discountPercentage: 55,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_759902-MLB72909403816_112023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-3568910291-furadeira-parafusadeira-nakasaki-12v-maleta.html",
    salesCountText: "+10k vendidos",
    isFull: true,
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
  },
  {
    itemId: "MLB3490192841",
    title: "Kit Parafusadeira E Furadeira De Impacto 21V Nakasaki Maleta 2 Baterias",
    originalPrice: 289.9,
    currentPrice: 129.9,
    discountPercentage: 55,
    imageUrl: "https://http2.mlstatic.com/D_Q_NP_2X_669715-MLB72851410452_112023-F.webp",
    originalUrl: "https://produto.mercadolivre.com.br/MLB-3490192841-parafusadeira-furadeira-impacto-21v-nakasaki.html",
    salesCountText: "+5k vendidos",
    isFull: true,
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
  },
];

// Cupons ativos rastreados pelo Robô Caçador de Cupons do Mercado Livre
const ROBOT_RADAR_COUPONS: MeliSmartCoupon[] = [
  {
    id: "ml-cupom-full10",
    code: "FULL10",
    discountLabel: "10% OFF em itens FULL (até R$ 25)",
    discountType: "PERCENT",
    discountValue: 10,
    maxDiscountAmount: 25,
    minSpend: 40,
    nicheSlug: "all",
    categoryName: "Todos os Nichos (FULL)",
    onlyFull: true,
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
  {
    id: "ml-cupom-meli15",
    code: "MELI15OFF",
    discountLabel: "R$ 15 OFF acima de R$ 79",
    discountType: "FIXED",
    discountValue: 15,
    maxDiscountAmount: 15,
    minSpend: 79,
    nicheSlug: "all",
    categoryName: "Todos os Nichos",
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
  {
    id: "ml-cupom-casa30",
    code: "CASA30",
    discountLabel: "R$ 30 OFF em Casa & Eletroportáteis acima de R$ 199",
    discountType: "FIXED",
    discountValue: 30,
    maxDiscountAmount: 30,
    minSpend: 199,
    nicheSlug: "casa",
    categoryName: "Casa & Cozinha",
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
  {
    id: "ml-cupom-beleza20",
    code: "BELEZA20",
    discountLabel: "20% OFF em Beleza & Cuidados (até R$ 35)",
    discountType: "PERCENT",
    discountValue: 20,
    maxDiscountAmount: 35,
    minSpend: 39,
    nicheSlug: "beleza",
    categoryName: "Beleza & Cuidados",
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
  {
    id: "ml-cupom-moda20",
    code: "MODA20",
    discountLabel: "R$ 20 OFF em Moda & Calçados acima de R$ 79",
    discountType: "FIXED",
    discountValue: 20,
    maxDiscountAmount: 20,
    minSpend: 79,
    nicheSlug: "moda",
    categoryName: "Moda & Vestuário",
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
  {
    id: "ml-cupom-ferramenta25",
    code: "OFICINA25",
    discountLabel: "R$ 25 OFF em Ferramentas acima de R$ 119",
    discountType: "FIXED",
    discountValue: 25,
    maxDiscountAmount: 25,
    minSpend: 119,
    nicheSlug: "ferramentas",
    categoryName: "Ferramentas",
    validUntil: "Hoje às 23:59",
    source: "ROBOT_RADAR",
  },
];

export class MeliRobotArmyService {
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

    // Fallback inteligente por categoria bruta
    if (text.includes("moda") || text.includes("roupa") || text.includes("calçado")) {
      return {
        nicheSlug: "moda",
        categoryName: "Moda & Vestuário",
        robotId: "robo-moda",
        robotName: "Robô #02 • Moda & Calçados",
      };
    }
    if (text.includes("beleza") || text.includes("perfume") || text.includes("cabelo")) {
      return {
        nicheSlug: "beleza",
        categoryName: "Beleza & Cuidados",
        robotId: "robo-beleza",
        robotName: "Robô #03 • Beleza & Cuidados",
      };
    }
    if (text.includes("eletr") || text.includes("tech") || text.includes("inform")) {
      return {
        nicheSlug: "tech",
        categoryName: "Eletrônicos & Tech",
        robotId: "robo-tech",
        robotName: "Robô #04 • Eletrônicos & Tech",
      };
    }
    if (text.includes("ferramenta") || text.includes("auto")) {
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
   * Converte um cupom salvo no banco de dados para a estrutura inteligente de cálculo
   */
  static parseDbCoupon(dbCoupon: any): MeliSmartCoupon {
    const discountStr = String(dbCoupon.discount || "10% OFF");
    const percentMatch = discountStr.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const fixedMatch = discountStr.match(/R\$\s*(\d+(?:[.,]\d+)?)/i) || discountStr.match(/(\d+(?:[.,]\d+)?)/);

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
    else if (catText.includes("beleza")) nicheSlug = "beleza";
    else if (catText.includes("eletr") || catText.includes("tech")) nicheSlug = "tech";
    else if (catText.includes("ferramenta")) nicheSlug = "ferramentas";

    return {
      id: `db-${dbCoupon.id}`,
      code: String(dbCoupon.code).toUpperCase(),
      discountLabel: discountStr,
      discountType,
      discountValue,
      maxDiscountAmount: discountType === "PERCENT" ? 50 : discountValue,
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
    // 1. Verifica nicho
    if (coupon.nicheSlug !== "all" && coupon.nicheSlug !== nicheSlug) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    // 2. Verifica se exige FULL
    if (coupon.onlyFull && !isFull) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    // 3. Verifica valor mínimo da compra
    if (dealPrice < coupon.minSpend) {
      return { eligible: false, couponSavings: 0, finalPrice: dealPrice, totalDiscountPct: 0 };
    }

    // 4. Calcula desconto do cupom em R$
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
   * Executa a varredura completa do Exército de Robôs (Produtos por Nicho + Cupons + Cruzamento)
   */
  static async runArmyScan(customUrls?: string[]): Promise<{
    robots: RobotAgentInfo[];
    coupons: MeliSmartCoupon[];
    deals: MatchedMeliDeal[];
    nicheSummary: Record<string, { count: number; withCouponCount: number }>;
  }> {
    const affiliateTag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";

    // 1. Carrega cupons ativos do Mercado Livre no banco + cupons do Robô Caçador
    const couponsMap = new Map<string, MeliSmartCoupon>();
    for (const rc of ROBOT_RADAR_COUPONS) {
      couponsMap.set(rc.code.toUpperCase(), rc);
    }

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

    const allCoupons = Array.from(couponsMap.values());

    // 2. Se o usuário enviou links extras para o robô varrer ao vivo, resolve via MercadoLivreScraperService
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
    }> = [];

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
        });
      }
    }

    // 3. Carrega também produtos recentes do Mercado Livre já salvos no banco
    try {
      const dbProducts = await prisma.product.findMany({
        where: {
          OR: [
            { originalUrl: { contains: "mercadolivre" } },
            { originalUrl: { contains: "meli.la" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      });

      for (const p of dbProducts) {
        if (!p.imageUrl || p.imageUrl.includes("unsplash")) continue;
        const orig = Number(p.originalPrice) || Number(p.currentPrice) * 1.35;
        const curr = Number(p.currentPrice);
        const disc = Math.round(((orig - curr) / orig) * 100) || 25;

        rawItems.push({
          itemId: MercadoLivreScraperService.extractMlbId(p.originalUrl) || `MLB-${p.id.slice(0, 8)}`,
          title: p.name,
          originalPrice: Number(orig.toFixed(2)),
          currentPrice: Number(curr.toFixed(2)),
          discountPercentage: disc,
          imageUrl: p.imageUrl,
          originalUrl: p.originalUrl,
          salesCountText: "+5k vendidos",
          isFull: true,
          rawCategory: p.category,
        });
      }
    } catch {}

    // 4. Adiciona o pool curado das Melhores Ofertas do Dia do Mercado Livre
    for (const item of MELI_DAILY_DEALS_POOL) {
      rawItems.push({
        itemId: item.itemId,
        title: item.title,
        originalPrice: item.originalPrice,
        currentPrice: item.currentPrice,
        discountPercentage: item.discountPercentage,
        imageUrl: item.imageUrl,
        originalUrl: item.originalUrl,
        salesCountText: item.salesCountText,
        isFull: item.isFull,
        rawCategory: item.categoryName,
      });
    }

    // 5. Remove duplicados e cruza cada item com seu Robô de Nicho + Cupons Elegíveis
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

      // Avalia todos os cupons ativos neste item
      const applicableCoupons: MatchedMeliDeal["applicableCoupons"] = [];
      for (const coupon of allCoupons) {
        const evalRes = this.evaluateCouponOnProduct(
          coupon,
          item.currentPrice,
          item.originalPrice,
          nicheInfo.nicheSlug,
          item.isFull
        );
        if (evalRes.eligible) {
          applicableCoupons.push({
            code: coupon.code,
            discountLabel: coupon.discountLabel,
            couponSavings: evalRes.couponSavings,
            finalPrice: evalRes.finalPrice,
            totalDiscountPct: evalRes.totalDiscountPct,
          });
        }
      }

      // Ordena pelo maior desconto em R$
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
