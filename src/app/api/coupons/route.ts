import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        marketplace: true,
      },
      orderBy: [{ status: "asc" }, { validUntil: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: coupons });
  } catch (error: any) {
    console.error("Erro ao listar cupons:", error);
    return NextResponse.json({ success: false, error: "Falha ao carregar cupons." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      marketplaceId,
      code,
      discount,
      minSpend,
      validUntil,
      category,
      link,
      notes,
    } = body;

    if (!marketplaceId || !code || !discount) {
      return NextResponse.json(
        { success: false, error: "Marketplace, código e desconto são obrigatórios." },
        { status: 400 }
      );
    }

    let status = "ACTIVE";
    if (validUntil) {
      const expiry = new Date(validUntil);
      const diffDays = (expiry.getTime() - Date.now()) / (1000 * 3600 * 24);
      if (diffDays < 0) status = "EXPIRED";
      else if (diffDays <= 3) status = "EXPIRING_SOON";
    }

    const coupon = await prisma.coupon.create({
      data: {
        marketplaceId,
        code: code.trim().toUpperCase(),
        discount,
        minSpend: minSpend ? parseFloat(minSpend) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        category: category || "Geral",
        link: link || null,
        status,
        notes: notes || null,
      },
      include: {
        marketplace: true,
      },
    });

    // Registrar notificação
    await prisma.notification.create({
      data: {
        title: "Novo Cupom Cadastrado",
        message: `Cupom ${coupon.code} (${coupon.discount}) adicionado para ${coupon.marketplace.name}.`,
        type: "INFO",
        link: "/coupons",
      },
    });

    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
