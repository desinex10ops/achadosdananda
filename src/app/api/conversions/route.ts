import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const conversions = await prisma.conversion.findMany({
      include: {
        offer: {
          include: { marketplace: true, product: true },
        },
        link: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: conversions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      offerId,
      linkId,
      orderId,
      orderValue,
      commissionValue,
      status = "APPROVED", // PENDING, APPROVED, CANCELLED, PAID
    } = body;

    if (!orderValue || !commissionValue) {
      return NextResponse.json(
        { success: false, error: "Valor do pedido e valor da comissão são obrigatórios." },
        { status: 400 }
      );
    }

    const conversion = await prisma.conversion.create({
      data: {
        offerId: offerId || null,
        linkId: linkId || null,
        orderId: orderId || `ORD-${Date.now()}`,
        orderValue: parseFloat(orderValue),
        commissionValue: parseFloat(commissionValue),
        status,
        convertedAt: new Date(),
      },
    });

    if (linkId) {
      await prisma.affiliateLink.update({
        where: { id: linkId },
        data: { conversionsCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, data: conversion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
