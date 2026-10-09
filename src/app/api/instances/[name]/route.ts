import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const body = await request.json();
    const { status, label, phone } = body;

    const updated = await prisma.whatsAppInstance.update({
      where: { name: params.name },
      data: {
        ...(status ? { status } : {}),
        ...(label ? { label } : {}),
        ...(phone ? { phone } : {}),
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    await prisma.whatsAppInstance.delete({
      where: { name: params.name },
    });
    return NextResponse.json({ success: true, message: "Instância removida." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
