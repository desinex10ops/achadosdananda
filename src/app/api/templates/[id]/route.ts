import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id },
    });
    if (!template) {
      return NextResponse.json({ success: false, error: "Template não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
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
    const { isDefault, ...rest } = body;

    if (isDefault) {
      await prisma.template.updateMany({
        where: { id: { not: params.id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.template.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(isDefault !== undefined ? { isDefault } : {}),
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
    await prisma.template.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Template excluído com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
