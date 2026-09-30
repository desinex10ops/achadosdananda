const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados Achados da Nanda...');

  // 1. Criar ou atualizar usuário admin pessoal
  const admin = await prisma.user.upsert({
    where: { email: 'nanda@achadosdananda.com.br' },
    update: {},
    create: {
      name: 'Fernanda (Nanda)',
      email: 'nanda@achadosdananda.com.br',
      passwordHash: 'admin123', // Em produção hash bcrypt
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'ADMIN',
      settings: {
        create: {
          defaultIntervalMinutes: 30,
          maxOffersPerHour: 4,
          maxDailyOffers: 20,
          antiRepeatHours: 48,
          autoQueueEnabled: true,
        },
      },
    },
  });
  console.log('✅ Usuário pessoal criado:', admin.email);

  // 2. Marketplaces
  const marketplaces = [
    {
      name: 'Shopee',
      slug: 'shopee',
      badgeColor: 'orange',
      icon: 'ShoppingBag',
      commissionRate: 5.0,
      affiliateTag: 'achadosdananda-20',
      defaultUrlPattern: 'https://shope.ee/',
    },
    {
      name: 'Mercado Livre',
      slug: 'mercado-livre',
      badgeColor: 'yellow',
      icon: 'Zap',
      commissionRate: 8.5,
      affiliateTag: 'meli-achadosnanda',
      defaultUrlPattern: 'https://mercadolivre.com/sec/',
    },
    {
      name: 'Amazon',
      slug: 'amazon',
      badgeColor: 'amber',
      icon: 'Package',
      commissionRate: 7.0,
      affiliateTag: 'achadosnanda-20',
      defaultUrlPattern: 'https://amzn.to/',
    },
    {
      name: 'Magalu',
      slug: 'magalu',
      badgeColor: 'blue',
      icon: 'Store',
      commissionRate: 4.5,
      affiliateTag: 'magalu-nanda',
      defaultUrlPattern: 'https://magazinevoce.com.br/',
    },
    {
      name: 'Outro Marketplace',
      slug: 'outro',
      badgeColor: 'gray',
      icon: 'Globe',
      commissionRate: 5.0,
      affiliateTag: '',
      defaultUrlPattern: '',
    },
  ];

  for (const m of marketplaces) {
    await prisma.marketplace.upsert({
      where: { slug: m.slug },
      update: m,
      create: m,
    });
  }
  console.log('✅ Marketplaces configurados.');

  // 3. Categorias de Grupos
  const categories = [
    { name: 'Geral', slug: 'geral', description: 'Ofertas variadas e achadinhos populares' },
    { name: 'Tecnologia', slug: 'tecnologia', description: 'Eletrônicos, smartphones, informática e gadgets' },
    { name: 'Casa & Cozinha', slug: 'casa-cozinha', description: 'Eletrodomésticos, utilidades e decoração' },
    { name: 'Moda & Beleza', slug: 'moda-beleza', description: 'Roupas, calçados, maquiagens e cuidados pessoais' },
    { name: 'Ferramentas', slug: 'ferramentas', description: 'Ferramentas manuais, elétricas e DIY' },
    { name: 'Games & Geek', slug: 'games-geek', description: 'Jogos, consoles, colecionáveis e periféricos' },
    { name: 'Cupons & Super Descontos', slug: 'cupons', description: 'Cupons exclusivos, bugs e liquidações relâmpago' },
  ];

  const createdCategories = {};
  for (const c of categories) {
    const cat = await prisma.groupCategory.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    createdCategories[c.slug] = cat.id;
  }
  console.log('✅ Categorias de grupos configuradas.');

  // 4. Grupos de Transmissão / Divulgação
  const groups = [
    {
      name: '🔥 Achados da Nanda - VIP Geral',
      categoryId: createdCategories['geral'],
      description: 'Principal canal de distribuição de promoções gerais',
      platform: 'WHATSAPP',
      allowedHoursStart: '08:00',
      allowedHoursEnd: '22:30',
      maxOffersPerHour: 4,
      maxDailyOffers: 25,
      minIntervalMinutes: 20,
      isActive: true,
    },
    {
      name: '⚡ Ofertas Tech & Gamers',
      categoryId: createdCategories['tecnologia'],
      description: 'Focado em produtos de informática, hardware, celulares e periféricos',
      platform: 'WHATSAPP',
      allowedHoursStart: '09:00',
      allowedHoursEnd: '22:00',
      maxOffersPerHour: 3,
      maxDailyOffers: 15,
      minIntervalMinutes: 30,
      isActive: true,
    },
    {
      name: '🏠 Achados de Casa & Cozinha',
      categoryId: createdCategories['casa-cozinha'],
      description: 'Air fryers, panelas, organizadores, aspiradores e utilidades',
      platform: 'WHATSAPP',
      allowedHoursStart: '08:30',
      allowedHoursEnd: '21:30',
      maxOffersPerHour: 3,
      maxDailyOffers: 15,
      minIntervalMinutes: 30,
      isActive: true,
    },
    {
      name: '💄 Beleza, Make & Estilo',
      categoryId: createdCategories['moda-beleza'],
      description: 'Produtos de skincare, perfumes, maquiagem e looks',
      platform: 'WHATSAPP',
      allowedHoursStart: '09:00',
      allowedHoursEnd: '21:00',
      maxOffersPerHour: 2,
      maxDailyOffers: 12,
      minIntervalMinutes: 40,
      isActive: true,
    },
    {
      name: '🎟️ Radar de Cupons e Erros de Preço',
      categoryId: createdCategories['cupons'],
      description: 'Cupons relâmpago, descontos imperdíveis e cashback alto',
      platform: 'WHATSAPP',
      allowedHoursStart: '07:30',
      allowedHoursEnd: '23:00',
      maxOffersPerHour: 5,
      maxDailyOffers: 30,
      minIntervalMinutes: 15,
      isActive: true,
    },
  ];

  for (const g of groups) {
    const existing = await prisma.group.findFirst({ where: { name: g.name } });
    if (!existing) {
      await prisma.group.create({ data: g });
    }
  }
  console.log('✅ Grupos iniciais criados.');

  // 5. 8 Templates Iniciais
  const templates = [
    {
      name: 'Oferta Relâmpago',
      type: 'OFERTA_RELAMPAGO',
      emoji: '⚡',
      header: '⚡ CORRE! OFERTA RELÂMPAGO ⚡',
      structure: `⚡ CORRE! OFERTA RELÂMPAGO ⚡\n\n📦 {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n💰 {DESCONTO} DE DESCONTO\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 GARANTA O SEU ANTES QUE ACABE:\n{LINK}\n\n⚠️ Preço sujeito a alteração a qualquer momento!`,
      cta: '👇 GARANTA O SEU ANTES QUE ACABE:',
      footer: '⚠️ Preço sujeito a alteração a qualquer momento!',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: true,
    },
    {
      name: 'Oferta do Dia',
      type: 'OFERTA_DO_DIA',
      emoji: '🔥',
      header: '🔥 OFERTA DO DIA 🔥',
      structure: `🔥 OFERTA DO DIA 🔥\n\n✨ {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n💰 {DESCONTO} DE DESCONTO\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 COMPRAR AGORA:\n{LINK}`,
      cta: '👇 COMPRAR AGORA:',
      footer: 'Achados da Nanda ✨ Segue para mais promoções!',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Achadinho',
      type: 'ACHADINHO',
      emoji: '💖',
      header: '💖 ACHADINHO IMPERDÍVEL 💖',
      structure: `💖 ACHADINHO DA NANDA 💖\n\n👀 Olha o que achei pra vocês:\n\n🛍️ {TITULO}\n\n{PRECO_DE}\n✨ Por apenas: {PRECO_POR}\n💸 Economia de {VALOR_ECONOMIZADO}\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 VEJA AQUI:\n{LINK}`,
      cta: '👇 VEJA AQUI:',
      footer: 'Gostou? Compartilha com as amigas! 💅',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Cupom Especial',
      type: 'CUPOM',
      emoji: '🎟️',
      header: '🎟️ CUPOM LIBERADO! 🎟️',
      structure: `🎟️ CUPOM LIBERADO NO APP 🎟️\n\n💥 {TITULO}\n\n🔥 Preço final com cupom: {PRECO_POR}\n🎟️ Use o código: {CUPOM}\n\n🚚 {FRETE}\n\n👇 APROVEITE O CUPOM:\n{LINK}`,
      cta: '👇 APROVEITE O CUPOM:',
      footer: 'Aplique o cupom na tela de pagamento.',
      showOriginalPrice: false,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Super Desconto',
      type: 'SUPER_DESCONTO',
      emoji: '💥',
      header: '💥 MENOR PREÇO HISTÓRICO 💥',
      structure: `💥 BAIXOU MUITO! DESCONTO PESADO 💥\n\n🎯 {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n📉 {DESCONTO} OFF (Economize {VALOR_ECONOMIZADO}!)\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 PEGA ANTES DE ESGOTAR:\n{LINK}`,
      cta: '👇 PEGA ANTES DE ESGOTAR:',
      footer: 'Estoque super limitado!',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Oferta Tech',
      type: 'OFERTA_TECH',
      emoji: '💻',
      header: '💻 OFERTA TECH & GADGETS 💻',
      structure: `💻 OFERTA TECH 💻\n\n📱 {TITULO}\n\n{PRECO_DE}\n⚡ Por: {PRECO_POR} à vista ou parcelado\n💰 {DESCONTO} OFF\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 LINK OFICIAL:\n{LINK}`,
      cta: '👇 LINK OFICIAL:',
      footer: 'Verifique a voltagem e especificações na página.',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Oferta Casa',
      type: 'OFERTA_CASA',
      emoji: '🏠',
      header: '🏠 ACHADO PARA SUA CASA 🏠',
      structure: `🏠 PRA DEIXAR SUA CASA LINDA 🏠\n\n🛋️ {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n💰 Economia de {VALOR_ECONOMIZADO}\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 COMPRE COM DESCONTO:\n{LINK}`,
      cta: '👇 COMPRE COM DESCONTO:',
      footer: 'Entrega rápida e garantida.',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
    {
      name: 'Oferta Geral',
      type: 'OFERTA_GERAL',
      emoji: '🛍️',
      header: '🛍️ OFERTA RECOMENDADA 🛍️',
      structure: `🛍️ OFERTA RECOMENDADA 🛍️\n\n📌 {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n💰 {DESCONTO} OFF\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 LINK DE COMPRA:\n{LINK}`,
      cta: '👇 LINK DE COMPRA:',
      footer: 'Achados da Nanda',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: false,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.template.create({ data: t });
    }
  }
  console.log('✅ 8 Templates iniciais criados.');

  // 6. Produtos & Ofertas de Exemplo para testes imediatos
  const shopee = await prisma.marketplace.findUnique({ where: { slug: 'shopee' } });
  const meli = await prisma.marketplace.findUnique({ where: { slug: 'mercado-livre' } });
  const amazon = await prisma.marketplace.findUnique({ where: { slug: 'amazon' } });

  if (shopee && meli && amazon) {
    const p1 = await prisma.product.create({
      data: {
        marketplaceId: shopee.id,
        name: 'Fone de Ouvido Bluetooth Sem Fio TWS AirPro',
        description: 'Cancelamento ativo de ruído, bateria de 24h com estojo e microfone HD.',
        category: 'Tecnologia',
        subcategory: 'Áudio',
        brand: 'TechSound',
        originalPrice: 199.90,
        currentPrice: 89.90,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
        originalUrl: 'https://shopee.com.br/product/123/456',
        affiliateUrl: 'https://shope.ee/exemplo1',
        stock: 45,
      },
    });

    const p2 = await prisma.product.create({
      data: {
        marketplaceId: meli.id,
        name: 'Fritadeira Air Fryer Digital 4L Antiaderente',
        description: 'Painel touch digital com 8 funções pré-programadas e cesto removível.',
        category: 'Casa & Cozinha',
        subcategory: 'Eletroportáteis',
        brand: 'GourmetPro',
        originalPrice: 429.90,
        currentPrice: 269.90,
        imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80',
        originalUrl: 'https://mercadolivre.com.br/p/MLB12345',
        affiliateUrl: 'https://mercadolivre.com/sec/exemplo2',
        stock: 20,
      },
    });

    const p3 = await prisma.product.create({
      data: {
        marketplaceId: amazon.id,
        name: 'Smartwatch Esportivo Pro Monitor Cardíaco e Sono',
        description: 'Resistente à água 5ATM, tela AMOLED e mais de 100 modos de treino.',
        category: 'Tecnologia',
        subcategory: 'Wearables',
        brand: 'FitPulse',
        originalPrice: 349.90,
        currentPrice: 199.90,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
        originalUrl: 'https://amazon.com.br/dp/B08XYZ123',
        affiliateUrl: 'https://amzn.to/exemplo3',
        stock: 15,
      },
    });

    // Criar Ofertas
    const o1 = await prisma.offer.create({
      data: {
        productId: p1.id,
        marketplaceId: shopee.id,
        title: 'Fone de Ouvido Bluetooth Sem Fio TWS',
        callout: 'Menor preço do mês com frete grátis!',
        originalPrice: 199.90,
        currentPrice: 89.90,
        discountPercentage: 55,
        savedAmount: 110.00,
        couponCode: 'SHOPEE55',
        shippingInfo: 'Frete Grátis com cupom',
        originalUrl: p1.originalUrl,
        affiliateUrl: p1.affiliateUrl || p1.originalUrl,
        status: 'QUEUED',
        priority: 1,
      },
    });

    const o2 = await prisma.offer.create({
      data: {
        productId: p2.id,
        marketplaceId: meli.id,
        title: 'Fritadeira Air Fryer Digital 4L Touch',
        callout: 'Desconto incrível no Full!',
        originalPrice: 429.90,
        currentPrice: 269.90,
        discountPercentage: 37,
        savedAmount: 160.00,
        couponCode: 'CASA10',
        shippingInfo: 'Frete Grátis Full',
        originalUrl: p2.originalUrl,
        affiliateUrl: p2.affiliateUrl || p2.originalUrl,
        status: 'SCHEDULED',
        priority: 2,
      },
    });

    const o3 = await prisma.offer.create({
      data: {
        productId: p3.id,
        marketplaceId: amazon.id,
        title: 'Smartwatch AMOLED Esportivo Pro',
        callout: 'Oferta exclusiva Prime',
        originalPrice: 349.90,
        currentPrice: 199.90,
        discountPercentage: 43,
        savedAmount: 150.00,
        couponCode: null,
        shippingInfo: 'Frete Grátis Prime',
        originalUrl: p3.originalUrl,
        affiliateUrl: p3.affiliateUrl || p3.originalUrl,
        status: 'PUBLISHED',
        priority: 1,
      },
    });

    // Adicionar à fila e publicações de teste
    const defaultTemplate = await prisma.template.findFirst({ where: { isDefault: true } });
    const vipGroup = await prisma.group.findFirst({ where: { name: { contains: 'VIP' } } });

    if (defaultTemplate && vipGroup) {
      const pub1 = await prisma.publication.create({
        data: {
          offerId: o1.id,
          templateId: defaultTemplate.id,
          status: 'PENDING',
          orderIndex: 0,
          generatedText: `⚡ CORRE! OFERTA RELÂMPAGO ⚡\n\n📦 ${o1.title}\n\nDe: R$ 199,90\n🔥 Por apenas: R$ 89,90\n💰 55% OFF\n\n🚚 Frete Grátis com cupom\n🎟️ Cupom: SHOPEE55\n\n👇 GARANTA O SEU ANTES QUE ACABE:\n${o1.affiliateUrl}`,
          publicationGroups: {
            create: {
              groupId: vipGroup.id,
              status: 'PENDING',
            },
          },
        },
      });

      const pub2 = await prisma.publication.create({
        data: {
          offerId: o2.id,
          templateId: defaultTemplate.id,
          status: 'SCHEDULED',
          scheduledFor: new Date(Date.now() + 3600 * 2000), // daqui 2 horas
          orderIndex: 1,
          generatedText: `⚡ CORRE! OFERTA RELÂMPAGO ⚡\n\n📦 ${o2.title}\n\nDe: R$ 429,90\n🔥 Por apenas: R$ 269,90\n💰 37% OFF\n\n🚚 Frete Grátis Full\n🎟️ Cupom: CASA10\n\n👇 GARANTA O SEU ANTES QUE ACABE:\n${o2.affiliateUrl}`,
          publicationGroups: {
            create: {
              groupId: vipGroup.id,
              status: 'PENDING',
            },
          },
        },
      });
    }

    // Criar Cupons de Exemplo
    await prisma.coupon.createMany({
      data: [
        {
          marketplaceId: shopee.id,
          code: 'SHOPEE20',
          discount: 'R$ 20 OFF',
          minSpend: 99.0,
          validUntil: new Date(Date.now() + 7 * 86400000),
          category: 'Geral',
          status: 'ACTIVE',
        },
        {
          marketplaceId: meli.id,
          code: 'MELI15OFF',
          discount: '15% OFF',
          minSpend: 150.0,
          validUntil: new Date(Date.now() + 2 * 86400000),
          category: 'Tecnologia',
          status: 'EXPIRING_SOON',
        },
      ],
    });
    console.log('✅ Ofertas, fila e cupons de teste semeados com sucesso!');
  }

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
