import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await (prisma as any).groupMirrorRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sourceGroupName,
      sourceGroupId,
      targetGroupId,
      targetGroupName,
      style = "CLONE",
      mediaFormat = "IMAGE",
      intervalMinutes = 0,
      isActive = true,
      filterOfficialOnly = true,
    } = body;

    if (!sourceGroupName || !targetGroupName) {
      return NextResponse.json(
        { success: false, error: "Grupo de Origem e Grupo de Destino são obrigatórios." },
        { status: 400 }
      );
    }

    const rule = await (prisma as any).groupMirrorRule.create({
      data: {
        sourceGroupName,
        sourceGroupId,
        targetGroupId,
        targetGroupName,
        style,
        mediaFormat,
        intervalMinutes: Number(intervalMinutes) || 0,
        isActive,
        filterOfficialOnly,
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido." }, { status: 400 });
    }

    await (prisma as any).groupMirrorRule.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Regra removida com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido." }, { status: 400 });
    }

    const updated = await (prisma as any).groupMirrorRule.update({
      where: { id },
      data: { isActive },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
