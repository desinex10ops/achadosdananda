import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await prisma.group.update({
      where: { id: params.id },
      data: {
        ...body,
        ...(body.maxOffersPerHour !== undefined ? { maxOffersPerHour: Number(body.maxOffersPerHour) } : {}),
        ...(body.maxDailyOffers !== undefined ? { maxDailyOffers: Number(body.maxDailyOffers) } : {}),
        ...(body.minIntervalMinutes !== undefined ? { minIntervalMinutes: Number(body.minIntervalMinutes) } : {}),
      },
      include: { category: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.group.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Grupo excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
