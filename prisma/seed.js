const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando dados transacionais e de teste anteriores...');

  // 0. Exclusão segura de dados simulados/anteriores para zerar o sistema
  try {
    await prisma.publicationGroup.deleteMany();
    await prisma.publication.deleteMany();
    await prisma.click.deleteMany();
    await prisma.conversion.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.product.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    console.log('✅ Banco limpo: 0 ofertas, 0 produtos, 0 métricas simuladas.');
  } catch (err) {
    console.log('ℹ️ Tabelas novas ou já vazias.');
  }

  console.log('🌱 Inicializando configurações essenciais do Achados da Nanda...');

  // 1. Criar ou atualizar usuário admin pessoal
  const admin = await prisma.user.upsert({
    where: { email: 'nanda@achadosdananda.com.br' },
    update: {
      name: 'Fernanda (Nanda)',
      role: 'ADMIN',
    },
    create: {
      name: 'Fernanda (Nanda)',
      email: 'nanda@achadosdananda.com.br',
      passwordHash: 'admin123',
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
  console.log('✅ Usuário administrador configurado:', admin.email);

  // 2. Marketplaces Oficiais com tags de afiliado
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
  ];

  for (const m of marketplaces) {
    await prisma.marketplace.upsert({
      where: { slug: m.slug },
      update: m,
      create: m,
    });
  }
  console.log('✅ 4 Marketplaces oficiais configurados.');

  // 3. Categorias de Grupos
  const categories = [
    { name: 'Geral', slug: 'geral', description: 'Ofertas variadas e achadinhos populares' },
    { name: 'Tecnologia', slug: 'tecnologia', description: 'Eletrônicos, smartphones, informática e gadgets' },
    { name: 'Casa & Cozinha', slug: 'casa-cozinha', description: 'Eletrodomésticos, utilidades e decoração' },
    { name: 'Moda & Beleza', slug: 'moda-beleza', description: 'Roupas, calçados, maquiagens e cuidados pessoais' },
    { name: 'Cupons & Super Descontos', slug: 'cupons', description: 'Cupons exclusivos e bugs relâmpago' },
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
      name: '🔥 Achados da Nanda - VIP Geral #01',
      categoryId: createdCategories['geral'],
      description: 'Principal canal de distribuição de promoções gerais',
      platform: 'WHATSAPP',
      allowedHoursStart: '08:00',
      allowedHoursEnd: '22:30',
      maxOffersPerHour: 4,
      maxDailyOffers: 25,
      minIntervalMinutes: 20,
      isActive: true,
      isVipRouter: true,
      inviteLink: 'https://chat.whatsapp.com/sample-achados-nanda',
    },
    {
      name: '⚡ Ofertas Tech & Casa',
      categoryId: createdCategories['tecnologia'],
      description: 'Focado em eletrônicos, celulares e utilidades',
      platform: 'WHATSAPP',
      allowedHoursStart: '09:00',
      allowedHoursEnd: '22:00',
      maxOffersPerHour: 3,
      maxDailyOffers: 15,
      minIntervalMinutes: 30,
      isActive: true,
      isVipRouter: false,
    },
  ];

  for (const g of groups) {
    const existing = await prisma.group.findFirst({ where: { name: g.name } });
    if (!existing) {
      await prisma.group.create({ data: g });
    }
  }
  console.log('✅ Grupos de divulgação configurados.');

  // 5. Templates Oficiais de Mensagem do WhatsApp
  const templates = [
    {
      name: 'Oferta Relâmpago (Padrão)',
      type: 'OFERTA_RELAMPAGO',
      emoji: '⚡',
      header: '⚡ CORRE QUE BAIXOU! ⚡',
      structure: `⚡ CORRE! OFERTA RELÂMPAGO ⚡\n\n📦 {TITULO}\n\n{PRECO_DE}\n🔥 Por apenas: {PRECO_POR}\n💰 {DESCONTO} OFF\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 GARANTA O SEU ANTES QUE ACABE:\n{LINK}`,
      cta: '👇 GARANTA O SEU ANTES QUE ACABE:',
      footer: 'Achados da Nanda ✨ Compartilhe com as amigas!',
      showOriginalPrice: true,
      showDiscount: true,
      showCoupon: true,
      showShipping: true,
      isDefault: true,
    },
    {
      name: 'Achadinho Amiga',
      type: 'ACHADINHO',
      emoji: '💖',
      header: '💖 ACHADINHO IMPERDÍVEL 💖',
      structure: `💖 ACHADINHO DA NANDA 💖\n\n👀 Meninas, olha o que encontrei pra vocês:\n\n🛍️ {TITULO}\n\n{PRECO_DE}\n✨ Por apenas: {PRECO_POR}\n💸 Economia de {VALOR_ECONOMIZADO}\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 VEJA AQUI:\n{LINK}`,
      cta: '👇 VEJA AQUI:',
      footer: 'Gostou? Compartilha no seu status! 💅',
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
      name: 'Super Desconto Histórico',
      type: 'SUPER_DESCONTO',
      emoji: '💥',
      header: '💥 MENOR PREÇO HISTÓRICO 💥',
      structure: `💥 BAIXOU MUITO! MENOR PREÇO HISTÓRICO 💥\n\n🎯 {TITULO}\n\n{PRECO_DE}\n🔥 {PRECO_POR}\n📉 {DESCONTO} OFF (Economize {VALOR_ECONOMIZADO}!)\n\n🚚 {FRETE}\n🎟️ {CUPOM}\n\n👇 PEGA ANTES DE ESGOTAR:\n{LINK}`,
      cta: '👇 PEGA ANTES DE ESGOTAR:',
      footer: 'Estoque super limitado!',
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
  console.log('✅ Templates oficiais configurados.');

  console.log('🎉 Sistema inicializado 100% LIMPO e funcional!');
  console.log('📊 Estado: 0 ofertas, 0 métricas simuladas. Pronto para capturas reais!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
