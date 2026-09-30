import { NextResponse } from "next/server";

interface CouponItem {
  id: string;
  code: string;
  marketplace: string;
  storeLogo: string;
  discount: string;
  description: string;
  minSpend?: string;
  validUntil: string;
  affiliateUrl: string;
  category: string;
  isHot?: boolean;
}

const sampleCoupons: CouponItem[] = [
  {
    id: "cupom-meli-1",
    code: "APP30OFF",
    marketplace: "Mercado Livre",
    storeLogo: "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolivre/logo__large_plus.png",
    discount: "R$ 30 OFF",
    description: "Válido em compras no app Mercado Livre para produtos selecionados.",
    minSpend: "Gasto mín. R$ 199",
    validUntil: "Hoje até 23:59",
    affiliateUrl: "https://mercadolivre.com/sec/achadosnanda",
    category: "Geral",
    isHot: true,
  },
  {
    id: "cupom-shopee-1",
    code: "ACHADOSNANDA10",
    marketplace: "Shopee",
    storeLogo: "https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/ca5d12864c12916957640b5494fbeee3.png",
    discount: "15% OFF",
    description: "Cupom exclusivo de boas-vindas e tecnologia em vendedores indicados.",
    minSpend: "Sem valor mínimo",
    validUntil: "Vagas limitadas",
    affiliateUrl: "https://shope.ee/achadosdananda",
    category: "Tecnologia",
    isHot: true,
  },
  {
    id: "cupom-amazon-1",
    code: "AMAZONCASA20",
    marketplace: "Amazon",
    storeLogo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    discount: "R$ 20 OFF",
    description: "Desconto especial em itens para Casa, Cozinha e Decoração.",
    minSpend: "Gasto mín. R$ 120",
    validUntil: "Esta semana",
    affiliateUrl: "https://amzn.to/achadosdananda-20",
    category: "Casa & Cozinha",
    isHot: true,
  },
  {
    id: "cupom-meli-2",
    code: "MELIFRETE",
    marketplace: "Mercado Livre",
    storeLogo: "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolivre/logo__large_plus.png",
    discount: "Frete Grátis",
    description: "Frete grátis em produtos de supermercado e limpeza com Full.",
    minSpend: "Gasto mín. R$ 79",
    validUntil: "Válido hoje",
    affiliateUrl: "https://mercadolivre.com/sec/achadosnanda",
    category: "Supermercado",
    isHot: false,
  },
  {
    id: "cupom-shopee-2",
    code: "BELEZA50",
    marketplace: "Shopee",
    storeLogo: "https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/ca5d12864c12916957640b5494fbeee3.png",
    discount: "R$ 50 OFF",
    description: "Desconto em Maquiagem, Skincare e Perfumaria importada.",
    minSpend: "Gasto mín. R$ 250",
    validUntil: "Enquanto durar o estoque",
    affiliateUrl: "https://shope.ee/achadosdananda",
    category: "Moda & Beleza",
    isHot: false,
  },
  {
    id: "cupom-amazon-2",
    code: "LIVROS30",
    marketplace: "Amazon",
    storeLogo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    discount: "30% OFF",
    description: "Seleção especial de Best-sellers e Desenvolvimento Pessoal.",
    minSpend: "Gasto mín. R$ 80",
    validUntil: "Até domingo",
    affiliateUrl: "https://amzn.to/achadosdananda-20",
    category: "Livros",
    isHot: false,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketplace = searchParams.get("marketplace");

  let list = [...sampleCoupons];
  if (marketplace && marketplace !== "ALL") {
    list = list.filter(
      (c) => c.marketplace.toLowerCase() === marketplace.toLowerCase()
    );
  }

  return NextResponse.json({
    success: true,
    total: list.length,
    data: list,
  });
}
