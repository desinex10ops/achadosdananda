import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDiscount } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        marketplace: true,
        publications: {
          include: {
            template: true,
            publicationGroups: {
              include: { group: true },
            },
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Oferta não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: offer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { originalPrice, currentPrice, ...rest } = body;

    let updateData: any = { ...rest };

    if (originalPrice !== undefined || currentPrice !== undefined) {
      const orig = originalPrice !== undefined ? parseFloat(originalPrice) : undefined;
      const curr = currentPrice !== undefined ? parseFloat(currentPrice) : undefined;

      const existing = await prisma.offer.findUnique({ where: { id: params.id } });
      if (existing) {
        const finalOrig = orig ?? existing.originalPrice;
        const finalCurr = curr ?? existing.currentPrice;
        const { discountPercentage, savedAmount } = calculateDiscount(finalOrig, finalCurr);

        updateData.originalPrice = finalOrig;
        updateData.currentPrice = finalCurr;
        updateData.discountPercentage = discountPercentage;
        updateData.savedAmount = savedAmount;
      }
    }

    const updated = await prisma.offer.update({
      where: { id: params.id },
      data: updateData,
      include: {
        product: true,
        marketplace: true,
      },
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
    await prisma.offer.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Oferta removida com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
