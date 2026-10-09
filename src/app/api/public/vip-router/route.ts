import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const utmSource = searchParams.get("utm_source") || undefined;
    const utmMedium = searchParams.get("utm_medium") || undefined;
    const utmCampaign = searchParams.get("utm_campaign") || undefined;
    const name = searchParams.get("name") || undefined;
    const phone = searchParams.get("phone") || undefined;

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    const niche = searchParams.get("niche") || searchParams.get("category");
    const nicheFilter: any = {};
    if (niche) {
      nicheFilter.category = {
        OR: [
          { slug: { contains: niche.toLowerCase() } },
          { name: { contains: niche.toLowerCase() } },
        ],
      };
    }

    // Busca o primeiro grupo VIP ativo com vagas disponíveis
    let targetGroup = await prisma.group.findFirst({
      where: {
        isVipRouter: true,
        isActive: true,
        platform: "WHATSAPP",
        inviteLink: { not: null },
        ...nicheFilter,
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Se o grupo atual atingiu a capacidade máxima (ex: 1000 membros/cliques), busca o próximo
    if (targetGroup && targetGroup.currentClicks >= targetGroup.maxMembers) {
      const nextGroup = await prisma.group.findFirst({
        where: {
          isVipRouter: true,
          isActive: true,
          platform: "WHATSAPP",
          inviteLink: { not: null },
          currentClicks: { lt: targetGroup.maxMembers },
          ...nicheFilter,
        },
        orderBy: [
          { priority: "asc" },
          { createdAt: "asc" },
        ],
      });
      if (nextGroup) {
        targetGroup = nextGroup;
      }
    }

    // Se nenhum grupo configurado como VIP router, pega qualquer grupo de WhatsApp com inviteLink
    if (!targetGroup) {
      targetGroup = await prisma.group.findFirst({
        where: {
          platform: "WHATSAPP",
          inviteLink: { not: null },
        },
      });
    }

    // Se achou grupo, incrementa contador de cliques
    if (targetGroup) {
      await prisma.group.update({
        where: { id: targetGroup.id },
        data: { currentClicks: { increment: 1 } },
      });
    }

    // Registra Lead no banco de dados para remarketing
    await prisma.lead.create({
      data: {
        name,
        phone,
        source: "VIP_ROUTER",
        utmSource,
        utmMedium,
        utmCampaign,
        ipAddress,
        userAgent,
      },
    });

    const destinationUrl = targetGroup?.inviteLink || "https://chat.whatsapp.com/";

    // Se a chamada veio via fetch JSON
    if (req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({
        success: true,
        destinationUrl,
        groupName: targetGroup?.name || "Grupo VIP Oficial",
        currentClicks: (targetGroup?.currentClicks || 0) + 1,
      });
    }

    // Redireciona diretamente para o WhatsApp
    return NextResponse.redirect(destinationUrl, 302);
  } catch (error: any) {
    console.error("Erro no roteador VIP:", error);
    return NextResponse.redirect("https://chat.whatsapp.com/", 302);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, utmSource, utmMedium, utmCampaign } = body;
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    // Busca grupo com auto-rotação
    let targetGroup = await prisma.group.findFirst({
      where: {
        isVipRouter: true,
        isActive: true,
        platform: "WHATSAPP",
        inviteLink: { not: null },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    if (targetGroup && targetGroup.currentClicks >= targetGroup.maxMembers) {
      const nextGroup = await prisma.group.findFirst({
        where: {
          isVipRouter: true,
          isActive: true,
          platform: "WHATSAPP",
          inviteLink: { not: null },
          currentClicks: { lt: targetGroup.maxMembers },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      });
      if (nextGroup) targetGroup = nextGroup;
    }

    if (!targetGroup) {
      targetGroup = await prisma.group.findFirst({
        where: { platform: "WHATSAPP", inviteLink: { not: null } },
      });
    }

    if (targetGroup) {
      await prisma.group.update({
        where: { id: targetGroup.id },
        data: { currentClicks: { increment: 1 } },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        source: "VIP_LEAD_FORM",
        utmSource,
        utmMedium,
        utmCampaign,
        ipAddress,
        userAgent,
      },
    });

    const destinationUrl = targetGroup?.inviteLink || "https://chat.whatsapp.com/";

    return NextResponse.json({
      success: true,
      destinationUrl,
      groupName: targetGroup?.name || "Grupo VIP Oficial",
      leadId: lead.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
