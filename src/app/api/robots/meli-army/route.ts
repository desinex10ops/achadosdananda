import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MeliRobotArmyService } from "@/modules/robots/meli-army";
import { MercadoLivreScraperService } from "@/modules/marketplaces/mercadolivre";
import { generateOfferMessage } from "@/modules/templates/engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const searchQuery = searchParams.get("q") || undefined;
    const onlyFemale = searchParams.get("onlyFemale") === "true";

    const scanResult = await MeliRobotArmyService.runArmyScan(
      undefined,
      forceRefresh,
      searchQuery,
      onlyFemale
    );

    let groups: any[] = [];
    try {
      groups = await prisma.group.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { priority: "desc" },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      ...scanResult,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        categoryName: g.category?.name || "Geral",
        categorySlug: g.category?.slug || "geral",
        whatsappJid: g.whatsappJid,
        instanceName: g.instanceName,
      })),
    });
  } catch (error: any) {
    console.error("Erro no GET /api/robots/meli-army:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao executar Exército de Robôs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // AÇÃO 0: Buscar produto específico ao vivo no Mercado Livre ou filtrar Só Produtos Femininos
    if (action === "SEARCH_QUERY") {
      const query = String(body.query || "").trim();
      const onlyFemale = Boolean(body.onlyFemale);
      const scanResult = await MeliRobotArmyService.runArmyScan(
        undefined,
        true,
        query,
        onlyFemale
      );
      return NextResponse.json({
        success: true,
        ...scanResult,
      });
    }

    // AÇÃO 1: Varrer URLs específicas do Mercado Livre ao vivo
    if (action === "SCAN_URLS") {
      const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
      const scanResult = await MeliRobotArmyService.runArmyScan(urls, true);
      return NextResponse.json({
        success: true,
        ...scanResult,
      });
    }

    // AÇÃO 1.5: Excluir / Marcar cupom digitável como esgotado
    if (action === "DELETE_COUPON") {
      const { couponId, code } = body;
      if (couponId && String(couponId).startsWith("db-")) {
        const realId = String(couponId).replace(/^db-/, "");
        await prisma.coupon.delete({ where: { id: realId } }).catch(() => {});
      } else if (code) {
        await prisma.coupon
          .deleteMany({ where: { code: String(code).toUpperCase() } })
          .catch(() => {});
      }
      const updatedScan = await MeliRobotArmyService.runArmyScan();
      return NextResponse.json({
        success: true,
        ...updatedScan,
      });
    }

    // Garante que o Marketplace Mercado Livre exista no banco
    let mlMarketplace = await prisma.marketplace.findFirst({
      where: {
        OR: [
          { slug: "mercado-livre" },
          { slug: "mercadolivre" },
          { name: { contains: "Mercado Livre" } },
        ],
      },
    });

    if (!mlMarketplace) {
      mlMarketplace = await prisma.marketplace.create({
        data: {
          name: "Mercado Livre",
          slug: "mercado-livre",
          badgeColor: "amber",
          commissionRate: 8.0,
        },
      });
    }

    // AÇÃO 2: Cadastrar novo Cupom Real do Mercado Livre
    if (action === "CREATE_COUPON") {
      const { code, discount, minSpend, category, notes } = body;
      if (!code || !discount) {
        return NextResponse.json(
          { success: false, error: "Código e desconto do cupom são obrigatórios." },
          { status: 400 }
        );
      }

      const coupon = await prisma.coupon.create({
        data: {
          marketplaceId: mlMarketplace.id,
          code: String(code).trim().toUpperCase(),
          discount: String(discount).trim(),
          minSpend: minSpend ? parseFloat(String(minSpend)) : 0,
          category: category || "Todos os Nichos",
          status: "ACTIVE",
          notes: notes || "Cupom oficial Mercado Livre",
        },
      });

      const updatedScan = await MeliRobotArmyService.runArmyScan();
      return NextResponse.json({
        success: true,
        coupon,
        ...updatedScan,
      });
    }

    // AÇÃO 3: Enfileirar 1 ou mais produtos (com o cupom aplicado + roteamento por nicho)
    if (action === "DISPATCH_DEALS") {
      const items: Array<{
        title: string;
        imageUrl: string;
        originalUrl: string;
        affiliateUrl?: string;
        originalPrice: number;
        dealPrice: number;
        finalPrice?: number;
        couponCode?: string | null;
        couponDiscountLabel?: string | null;
        isCheckboxCoupon?: boolean;
        categoryName: string;
        nicheSlug: string;
        isFull?: boolean;
      }> = Array.isArray(body.items) ? body.items : [];

      if (items.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nenhum item selecionado para envio." },
          { status: 400 }
        );
      }

      const affiliateTag = process.env.MERCADO_LIVRE_AFFILIATE_TAG || "clma9212398";

      let template = await prisma.template.findFirst({ where: { isDefault: true } });
      if (!template) {
        template = await prisma.template.findFirst();
      }

      const activeGroups = await prisma.group.findMany({
        where: { isActive: true },
        include: { category: true },
      });

      const lastPub = await prisma.publication.findFirst({
        where: { status: { in: ["PENDING", "SCHEDULED"] } },
        orderBy: { scheduledFor: "desc" },
      });

      const now = new Date();
      let nextScheduledTime = lastPub?.scheduledFor
        ? new Date(Math.max(now.getTime(), new Date(lastPub.scheduledFor).getTime()) + 8 * 60 * 1000)
        : new Date(now.getTime() + 5 * 60 * 1000);

      let nextOrderIndex = (lastPub?.orderIndex ?? 0) + 1;
      let queuedCount = 0;

      for (const item of items) {
        const finalAffiliateUrl = MercadoLivreScraperService.convertToAffiliateUrl(
          item.originalUrl,
          affiliateTag
        );

        const effectivePrice =
          item.finalPrice && item.finalPrice > 0 ? Number(item.finalPrice) : Number(item.dealPrice);
        const origPrice = Math.max(Number(item.originalPrice), effectivePrice);
        const discPct = Math.round(((origPrice - effectivePrice) / origPrice) * 100) || 25;
        const savedAmount = Number((origPrice - effectivePrice).toFixed(2));

        // Se for cupom nativo de checkbox na página do anúncio, orienta o cliente a marcar o cupom no anúncio
        const displayCouponForOffer = item.isCheckboxCoupon
          ? "ATIVAR NO ANÚNCIO"
          : item.couponCode || null;

        const calloutText = item.isCheckboxCoupon
          ? `🎟️ CUPOM ATIVO NO ANÚNCIO (${item.couponDiscountLabel || "Aplicar na página"})`
          : item.couponCode
          ? `🎟️ COM CUPOM ${item.couponCode}`
          : "🔥 OFERTA DO DIA MERCADO LIVRE";

        // 1. Cria Produto
        const product = await prisma.product.create({
          data: {
            marketplaceId: mlMarketplace.id,
            name: item.title,
            category: item.categoryName || "Mercado Livre",
            originalPrice: origPrice,
            currentPrice: effectivePrice,
            imageUrl: item.imageUrl,
            originalUrl: item.originalUrl,
            affiliateUrl: finalAffiliateUrl,
          },
        });

        // 2. Cria Oferta
        const offer = await prisma.offer.create({
          data: {
            productId: product.id,
            marketplaceId: mlMarketplace.id,
            title: item.title,
            callout: calloutText,
            originalPrice: origPrice,
            currentPrice: effectivePrice,
            discountPercentage: discPct,
            savedAmount,
            couponCode: displayCouponForOffer,
            shippingInfo: item.isFull ? "Frete Grátis FULL ⚡" : "Frete Grátis",
            originalUrl: item.originalUrl,
            affiliateUrl: finalAffiliateUrl,
            status: "SCHEDULED",
            priority: displayCouponForOffer ? 3 : 2,
          },
        });

        // 3. Roteamento Inteligente de Grupo por Nicho
        const nicheLower = (item.nicheSlug || "").toLowerCase();
        const catLower = (item.categoryName || "").toLowerCase();

        let targetGroups = activeGroups.filter((g) => {
          const gCatName = (g.category?.name || "").toLowerCase();
          const gCatSlug = (g.category?.slug || "").toLowerCase();
          const gName = g.name.toLowerCase();
          return (
            (nicheLower && (gCatSlug.includes(nicheLower) || gName.includes(nicheLower))) ||
            (catLower && gCatName.includes(catLower.split(" ")[0]))
          );
        });

        if (targetGroups.length === 0) {
          targetGroups = activeGroups.filter((g) => !!g.whatsappJid);
        }
        if (targetGroups.length === 0) {
          targetGroups = activeGroups;
        }

        // 4. Monta a mensagem formatada
        let generatedText = "";
        if (template) {
          generatedText = generateOfferMessage(
            {
              title: offer.title,
              callout: calloutText,
              originalPrice: offer.originalPrice,
              currentPrice: offer.currentPrice,
              discountPercentage: offer.discountPercentage,
              savedAmount: offer.savedAmount,
              couponCode: item.isCheckboxCoupon
                ? `Ative o cupom direto na página do anúncio!`
                : offer.couponCode,
              shippingInfo: offer.shippingInfo,
              affiliateUrl: finalAffiliateUrl,
              marketplaceName: "Mercado Livre",
            },
            template
          );
        } else {
          generatedText = `🔥 *${offer.title}*\n\nDe: ~R$ ${offer.originalPrice
            .toFixed(2)
            .replace(".", ",")}~\nPor apenas: *R$ ${offer.currentPrice
            .toFixed(2)
            .replace(".", ",")}* (${offer.discountPercentage}% OFF)${
            item.isCheckboxCoupon
              ? `\n🎟️ *Dica:* Marque a caixinha "Aplicar cupom" dentro do anúncio!`
              : offer.couponCode
              ? `\n🎟️ Use o Cupom: *${offer.couponCode}*`
              : ""
          }\n🚚 ${offer.shippingInfo}\n\n👇 COMPRE NO MERCADO LIVRE:\n${finalAffiliateUrl}`;
        }

        if (template) {
          await prisma.publication.create({
            data: {
              offerId: offer.id,
              templateId: template.id,
              status: "SCHEDULED",
              scheduledFor: nextScheduledTime,
              orderIndex: nextOrderIndex++,
              generatedText,
              publicationGroups: {
                create: targetGroups.map((g) => ({
                  groupId: g.id,
                  status: "PENDING",
                })),
              },
            },
          });
        }

        nextScheduledTime = new Date(nextScheduledTime.getTime() + 8 * 60 * 1000);
        queuedCount++;
      }

      return NextResponse.json({
        success: true,
        queuedCount,
        message: `${queuedCount} oferta(s) reais do Mercado Livre enviadas para a Vitrine e Fila do WhatsApp separadas por nicho!`,
      });
    }

    return NextResponse.json({ success: false, error: "Ação inválida." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro no POST /api/robots/meli-army:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao processar comando dos robôs." },
      { status: 500 }
    );
  }
}
