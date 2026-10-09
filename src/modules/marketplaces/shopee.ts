import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface ShopeeProductItem {
  id: string;
  itemId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercentage: number;
  imageUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  salesCount: number;
  rating: number;
  commissionRate: number;
  shopName: string;
  isTopSeller: boolean;
  hasExtraCommission: boolean;
  category: string;
}

export interface ShopeeSearchParams {
  keyword?: string;
  category?: string;
  sort?: "DISCOUNT_DESC" | "SALES_DESC" | "PRICE_ASC" | "PRICE_DESC" | "COMMISSION_DESC" | "RELEVANCE";
  limit?: number;
  page?: number;
  topSellersOnly?: boolean;
  extraCommissionOnly?: boolean;
}

// Curated realistic catalog for immediate preview / demo when keys are not configured
const MOCK_SHOPEE_PRODUCTS: ShopeeProductItem[] = [
  {
    id: "sp-101",
    itemId: "2384910291",
    title: "Processador AMD Ryzen 5 5600X 3.7GHz (4.6GHz Turbo) 6-Core 12-Threads AM4",
    originalPrice: 1999.00,
    currentPrice: 848.48,
    discountPercentage: 58,
    imageUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/2384910291",
    affiliateUrl: "https://shope.ee/achadosnanda-ryzen5",
    salesCount: 1420,
    rating: 4.9,
    commissionRate: 5.0,
    shopName: "Terabyte Oficial",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Eletrônicos",
  },
  {
    id: "sp-102",
    itemId: "9482710294",
    title: "Kit Upgrade AMD Ryzen 5 5500 + Placa Mãe B450M DDR4 + 16GB RAM 3200MHz",
    originalPrice: 2499.00,
    currentPrice: 1229.90,
    discountPercentage: 51,
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/9482710294",
    affiliateUrl: "https://shope.ee/achadosnanda-kit-ryzen",
    salesCount: 890,
    rating: 4.8,
    commissionRate: 4.5,
    shopName: "Pichau Oficial",
    isTopSeller: true,
    hasExtraCommission: false,
    category: "Eletrônicos",
  },
  {
    id: "sp-103",
    itemId: "4820194820",
    title: "Fritadeira Sem Óleo Air Fryer Digital 4.5L Touch Inox Antiaderente 1500W",
    originalPrice: 489.90,
    currentPrice: 239.90,
    discountPercentage: 51,
    imageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/4820194820",
    affiliateUrl: "https://shope.ee/achadosnanda-airfryer",
    salesCount: 3540,
    rating: 4.9,
    commissionRate: 6.0,
    shopName: "Mondial Eletro",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Casa & Cozinha",
  },
  {
    id: "sp-104",
    itemId: "7729183921",
    title: "Vestido Midi Feminino Elegante Manga Bufante Lastex Tecido Duna Premium",
    originalPrice: 159.90,
    currentPrice: 69.90,
    discountPercentage: 56,
    imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/7729183921",
    affiliateUrl: "https://shope.ee/achadosnanda-vestido-midi",
    salesCount: 6200,
    rating: 4.8,
    commissionRate: 8.0,
    shopName: "Bella Moda Feminina",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Moda & Acessórios",
  },
  {
    id: "sp-105",
    itemId: "3920194819",
    title: "Kit Maquiagem Completo com Paleta de Sombras, Pincéis e Base Matte HD",
    originalPrice: 199.90,
    currentPrice: 79.90,
    discountPercentage: 60,
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/3920194819",
    affiliateUrl: "https://shope.ee/achadosnanda-make-kit",
    salesCount: 4120,
    rating: 4.7,
    commissionRate: 7.5,
    shopName: "Glow Cosméticos",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Beleza & Cuidados",
  },
  {
    id: "sp-106",
    itemId: "1192837492",
    title: "Robô Aspirador de Pó Inteligente 3 em 1 Varre Aspira e Passa Pano Bivolt",
    originalPrice: 399.00,
    currentPrice: 149.90,
    discountPercentage: 62,
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/1192837492",
    affiliateUrl: "https://shope.ee/achadosnanda-robo-aspirador",
    salesCount: 2900,
    rating: 4.6,
    commissionRate: 6.5,
    shopName: "Smart House Store",
    isTopSeller: false,
    hasExtraCommission: true,
    category: "Casa & Cozinha",
  },
  {
    id: "sp-107",
    itemId: "5591827401",
    title: "Fone de Ouvido Bluetooth Sem Fio TWS Cancelamento de Ruído Bateria 30h",
    originalPrice: 149.90,
    currentPrice: 42.90,
    discountPercentage: 71,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/5591827401",
    affiliateUrl: "https://shope.ee/achadosnanda-fone-tws",
    salesCount: 8400,
    rating: 4.9,
    commissionRate: 5.0,
    shopName: "Audio Tech Global",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Eletrônicos",
  },
  {
    id: "sp-108",
    itemId: "8829104829",
    title: "Conjunto Moletom Feminino Flanelado Blusa Capuz e Calça Jogger Confort",
    originalPrice: 179.90,
    currentPrice: 89.90,
    discountPercentage: 50,
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/8829104829",
    affiliateUrl: "https://shope.ee/achadosnanda-moletom",
    salesCount: 1980,
    rating: 4.8,
    commissionRate: 7.0,
    shopName: "Casual Chic Moda",
    isTopSeller: false,
    hasExtraCommission: false,
    category: "Moda & Acessórios",
  },
  {
    id: "sp-109",
    itemId: "9910293847",
    title: "Smartwatch Relógio Inteligente Monitor Cardíaco Notificações WhatsApp IP68",
    originalPrice: 229.00,
    currentPrice: 79.90,
    discountPercentage: 65,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/9910293847",
    affiliateUrl: "https://shope.ee/achadosnanda-smartwatch",
    salesCount: 5200,
    rating: 4.7,
    commissionRate: 6.0,
    shopName: "Pulse Watch Store",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Eletrônicos",
  },
  {
    id: "sp-110",
    itemId: "3301928471",
    title: "Kit 10 Organizadores de Gavetas Transparentes Acrílico Closet Maquiagem",
    originalPrice: 129.90,
    currentPrice: 49.90,
    discountPercentage: 62,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/3301928471",
    affiliateUrl: "https://shope.ee/achadosnanda-organizadores",
    salesCount: 3100,
    rating: 4.9,
    commissionRate: 8.0,
    shopName: "Lar & Organização",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Casa & Cozinha",
  },
  {
    id: "sp-111",
    itemId: "6610293812",
    title: "Mochila Executiva Antifurto Impermeável para Notebook com Entrada USB",
    originalPrice: 199.90,
    currentPrice: 89.90,
    discountPercentage: 55,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/6610293812",
    affiliateUrl: "https://shope.ee/achadosnanda-mochila",
    salesCount: 2400,
    rating: 4.8,
    commissionRate: 6.0,
    shopName: "Bags & Co",
    isTopSeller: false,
    hasExtraCommission: false,
    category: "Moda & Acessórios",
  },
  {
    id: "sp-112",
    itemId: "7710293812",
    title: "Luminária de Mesa LED Articulada com Carregador por Indução Sem Fio Touch",
    originalPrice: 189.90,
    currentPrice: 79.90,
    discountPercentage: 58,
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=80",
    originalUrl: "https://shopee.com.br/product/7710293812",
    affiliateUrl: "https://shope.ee/achadosnanda-luminaria",
    salesCount: 1650,
    rating: 4.9,
    commissionRate: 7.0,
    shopName: "Ilumina Decor",
    isTopSeller: true,
    hasExtraCommission: true,
    category: "Casa & Cozinha",
  }
];

export class ShopeeAffiliateService {
  /**
   * Obtém credenciais da Shopee cadastradas no banco ou no .env
   */
  static async getCredentials(): Promise<{
    appId: string | null;
    appSecret: string | null;
    affiliateTag: string | null;
    isConfigured: boolean;
  }> {
    const marketplace = await prisma.marketplace.findUnique({
      where: { slug: "shopee" },
    });

    const appId = marketplace?.appId || process.env.SHOPEE_APP_ID || null;
    const appSecret = marketplace?.apiSecret || process.env.SHOPEE_APP_SECRET || null;
    const affiliateTag = marketplace?.affiliateTag || process.env.SHOPEE_AFFILIATE_TAG || null;

    const isConfigured = Boolean(appId && appSecret && appId.trim() !== "" && appSecret.trim() !== "");

    return { appId, appSecret, affiliateTag, isConfigured };
  }

  /**
   * Salva credenciais da Shopee no banco de dados
   */
  static async saveCredentials(params: {
    appId?: string;
    appSecret?: string;
    affiliateTag?: string;
  }): Promise<void> {
    const { appId, appSecret, affiliateTag } = params;

    await prisma.marketplace.upsert({
      where: { slug: "shopee" },
      create: {
        name: "Shopee",
        slug: "shopee",
        badgeColor: "orange",
        isActive: true,
        commissionRate: 5.0,
        appId: appId || null,
        apiSecret: appSecret || null,
        affiliateTag: affiliateTag || null,
      },
      update: {
        ...(appId !== undefined && { appId }),
        ...(appSecret !== undefined && { apiSecret: appSecret }),
        ...(affiliateTag !== undefined && { affiliateTag }),
      },
    });
  }

  /**
   * Gera a assinatura de segurança SHA256 exigida pela Shopee Open API
   */
  static generateSignature(appId: string, timestamp: number, payload: string, appSecret: string): string {
    const baseString = `${appId}${timestamp}${payload}${appSecret}`;
    return crypto.createHash("sha256").update(baseString).digest("hex");
  }

  /**
   * Testa a conectividade com a API oficial da Shopee
   */
  static async testConnection(appId: string, appSecret: string): Promise<{ success: boolean; message: string }> {
    if (!appId || !appSecret) {
      return { success: false, message: "App ID e App Secret são obrigatórios." };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const query = `
      query {
        productOfferV2(page: 1, limit: 1) {
          nodes {
            itemId
            productName
          }
        }
      }
    `;
    const payload = JSON.stringify({ query });
    const signature = this.generateSignature(appId, timestamp, payload, appSecret);

    try {
      const response = await fetch("https://open-api.affiliate.shopee.com.br/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
        },
        body: payload,
      });

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return {
          success: false,
          message: `Shopee API retornou erro: ${data.errors[0].message || "Credenciais inválidas"}`,
        };
      }

      return {
        success: true,
        message: "Conexão com a Shopee Open API realizada com sucesso! Credenciais válidas.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na conexão de rede com a Shopee: ${err.message}`,
      };
    }
  }

  /**
   * Busca produtos através da Shopee Open API ou fallback de catálogo
   */
  static async searchProducts(params: ShopeeSearchParams): Promise<{
    items: ShopeeProductItem[];
    total: number;
    source: "API_LIVE" | "PREVIEW_CATALOG";
  }> {
    const creds = await this.getCredentials();

    if (creds.isConfigured && creds.appId && creds.appSecret) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const requestedLimit = params.limit || 50;
        const page = params.page || 1;

        // Normaliza variações que quebram a indexação da Shopee (ex: "cera ve" -> "cerave")
        let searchKeyword = (params.keyword || "").trim();
        if (searchKeyword) {
          searchKeyword = searchKeyword
            .replace(/\bcera\s+ve\b/gi, "cerave")
            .replace(/\bcera-ve\b/gi, "cerave")
            .replace(/\bair\s+frayer\b/gi, "air fryer")
            .replace(/\bair\s+frier\b/gi, "air fryer")
            .replace(/\bcroc's\b/gi, "crocs")
            .replace(/\banti\s+friz\b/gi, "antifrizz")
            .replace(/\banti-frizz\b/gi, "antifrizz");
        }

        // sortType na Shopee API:
        // 1: LATEST / RELEVANCE, 2: PRICE_ASC, 3: PRICE_DESC, 4: DISCOUNT_DESC, 5: COMMISSION_DESC, 6: SALES_DESC
        let sortType = 4;
        if (params.sort === "RELEVANCE") sortType = 1;
        else if (params.sort === "SALES_DESC") sortType = 6;
        else if (params.sort === "PRICE_ASC") sortType = 2;
        else if (params.sort === "PRICE_DESC") sortType = 3;
        else if (params.sort === "COMMISSION_DESC") sortType = 5;
        else if (params.sort === "DISCOUNT_DESC") sortType = 4;

        // Função auxiliar para fazer uma requisição à Shopee com limite máximo de 50
        const fetchShopeePage = async (
          pageNumber: number,
          pageLimit: number,
          overrideKeyword?: string,
          overrideTopSellers?: boolean
        ) => {
          const query = `
            query ProductOffer($keyword: String, $page: Int, $limit: Int, $sortType: Int, $isKeySeller: Boolean, $isAMSOffer: Boolean) {
              productOfferV2(
                keyword: $keyword,
                page: $page,
                limit: $limit,
                sortType: $sortType,
                isKeySeller: $isKeySeller,
                isAMSOffer: $isAMSOffer
              ) {
                nodes {
                  itemId
                  productName
                  imageUrl
                  productLink
                  offerLink
                  price
                  priceMin
                  priceMax
                  priceDiscountRate
                  commissionRate
                  sales
                  ratingStar
                  shopName
                  shopType
                }
              }
            }
          `;

          const kw = overrideKeyword !== undefined ? overrideKeyword : searchKeyword;
          const topSellers = overrideTopSellers !== undefined ? overrideTopSellers : params.topSellersOnly;

          const variables: any = {
            page: pageNumber,
            limit: Math.min(pageLimit, 50),
            sortType,
          };

          if (kw && kw.trim() !== "") {
            variables.keyword = kw.trim();
          }

          if (topSellers) {
            variables.isKeySeller = true;
          }

          if (params.extraCommissionOnly) {
            variables.isAMSOffer = true;
          }

          const payload = JSON.stringify({ query, variables });
          const reqTimestamp = Math.floor(Date.now() / 1000);
          const signature = this.generateSignature(creds.appId!, reqTimestamp, payload, creds.appSecret!);

          const response = await fetch("https://open-api.affiliate.shopee.com.br/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `SHA256 Credential=${creds.appId}, Timestamp=${reqTimestamp}, Signature=${signature}`,
            },
            body: payload,
          });

          const json = await response.json();
          if (json.errors) {
            console.warn("Shopee API errors:", JSON.stringify(json.errors));
          }
          return json.data?.productOfferV2?.nodes || [];
        };

        // Buscar produtos respeitando o teto de 50 por página da Shopee
        let rawNodes: any[] = [];
        if (requestedLimit > 50) {
          const [page1Nodes, page2Nodes] = await Promise.all([
            fetchShopeePage(1, 50),
            fetchShopeePage(2, Math.min(requestedLimit - 50, 50)),
          ]);
          rawNodes = [...page1Nodes, ...page2Nodes];
        } else {
          rawNodes = await fetchShopeePage(page, requestedLimit);
        }

        // Se topSellersOnly estava ativado e retornou vazio (limitação de Key Sellers no AMS), tenta sem o filtro
        if ((!rawNodes || rawNodes.length === 0) && params.topSellersOnly) {
          rawNodes = await fetchShopeePage(page, requestedLimit, searchKeyword, false);
        }

        // Se a busca com palavra-chave não retornou nada, tenta variações sem espaços ou termo original
        if ((!rawNodes || rawNodes.length === 0) && searchKeyword) {
          if (searchKeyword.includes(" ")) {
            const joinedKw = searchKeyword.replace(/\s+/g, "");
            rawNodes = await fetchShopeePage(page, requestedLimit, joinedKw, false);
          } else if (params.keyword && params.keyword !== searchKeyword) {
            rawNodes = await fetchShopeePage(page, requestedLimit, params.keyword, false);
          }
        }

        if (rawNodes && rawNodes.length > 0) {
          const items: ShopeeProductItem[] = rawNodes.map((n: any, idx: number) => {
            const currentPrice = Number(n.priceMin || n.price || 0);
            const discountPct = Number(n.priceDiscountRate || 0);
            const originalPrice = discountPct > 0 ? currentPrice / (1 - discountPct / 100) : currentPrice;
            const rawCommRate = parseFloat(n.commissionRate || "0.05");
            const commissionRate = rawCommRate > 1 ? rawCommRate : Number((rawCommRate * 100).toFixed(1));

            return {
              id: `shopee-${n.itemId || idx}`,
              itemId: String(n.itemId),
              title: n.productName || "Produto Shopee",
              originalPrice: Number(originalPrice.toFixed(2)),
              currentPrice: Number(currentPrice.toFixed(2)),
              discountPercentage: Math.round(discountPct),
              imageUrl: n.imageUrl || "",
              originalUrl: n.productLink || `https://shopee.com.br/product/${n.itemId}`,
              affiliateUrl: n.offerLink || n.productLink || `https://shopee.com.br/product/${n.itemId}`,
              salesCount: Number(n.sales || 0),
              rating: Number(n.ratingStar || 5.0),
              commissionRate,
              shopName: n.shopName || "Loja Shopee",
              isTopSeller: (n.shopType === 1 || n.shopType === 2 || (n.sales || 0) > 200),
              hasExtraCommission: commissionRate >= 6.0,
              category: params.category || "Geral",
            };
          });

          return {
            items,
            total: items.length,
            source: "API_LIVE",
          };
        }
      } catch (err) {
        console.warn("Shopee Live API request falhou, caindo para catálogo de demonstração:", err);
      }
    }

    // Fallback: Filtro sobre o catálogo interno
    let filtered = [...MOCK_SHOPEE_PRODUCTS];

    if (params.keyword && params.keyword.trim() !== "") {
      const q = params.keyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.shopName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (params.category && params.category !== "Todas as categorias" && params.category !== "TODAS") {
      filtered = filtered.filter(p => p.category.toLowerCase() === params.category!.toLowerCase());
    }

    if (params.topSellersOnly) {
      filtered = filtered.filter(p => p.isTopSeller);
    }

    if (params.extraCommissionOnly) {
      filtered = filtered.filter(p => p.hasExtraCommission);
    }

    // Ordenação
    if (params.sort === "DISCOUNT_DESC" || !params.sort) {
      filtered.sort((a, b) => b.discountPercentage - a.discountPercentage);
    } else if (params.sort === "SALES_DESC") {
      filtered.sort((a, b) => b.salesCount - a.salesCount);
    } else if (params.sort === "PRICE_ASC") {
      filtered.sort((a, b) => a.currentPrice - b.currentPrice);
    } else if (params.sort === "PRICE_DESC") {
      filtered.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (params.sort === "COMMISSION_DESC") {
      filtered.sort((a, b) => b.commissionRate - a.commissionRate);
    }

    const limit = params.limit || 20;
    const page = params.page || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      items: paginated.length > 0 ? paginated : filtered.slice(0, limit),
      total: filtered.length,
      source: "PREVIEW_CATALOG",
    };
  }
}
