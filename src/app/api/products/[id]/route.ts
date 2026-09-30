import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        marketplace: true,
        offers: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Produto não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
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
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...body,
        originalPrice: body.originalPrice !== undefined ? parseFloat(body.originalPrice) : undefined,
        currentPrice: body.currentPrice !== undefined ? parseFloat(body.currentPrice) : undefined,
        stock: body.stock !== undefined ? (body.stock ? parseInt(body.stock) : null) : undefined,
      },
      include: { marketplace: true },
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
    await prisma.product.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Produto excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
