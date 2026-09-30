import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error("Erro ao listar templates:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar templates." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      type = "CUSTOM",
      emoji = "🔥",
      header,
      structure,
      cta,
      footer,
      showOriginalPrice = true,
      showDiscount = true,
      showCoupon = true,
      showShipping = true,
      isDefault = false,
      duplicateFromId,
    } = body;

    // Se estiver duplicando um template existente
    if (duplicateFromId) {
      const source = await prisma.template.findUnique({
        where: { id: duplicateFromId },
      });

      if (!source) {
        return NextResponse.json(
          { success: false, error: "Template de origem não encontrado." },
          { status: 404 }
        );
      }

      const duplicated = await prisma.template.create({
        data: {
          name: `${source.name} (Cópia)`,
          type: "CUSTOM",
          emoji: source.emoji,
          header: source.header,
          structure: source.structure,
          cta: source.cta,
          footer: source.footer,
          showOriginalPrice: source.showOriginalPrice,
          showDiscount: source.showDiscount,
          showCoupon: source.showCoupon,
          showShipping: source.showShipping,
          isDefault: false,
        },
      });

      return NextResponse.json({ success: true, data: duplicated }, { status: 201 });
    }

    if (!name || !structure) {
      return NextResponse.json(
        { success: false, error: "Nome e estrutura do template são obrigatórios." },
        { status: 400 }
      );
    }

    if (isDefault) {
      // Remover flag default dos outros
      await prisma.template.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.template.create({
      data: {
        name,
        type,
        emoji,
        header: header || name,
        structure,
        cta: cta || "👇 COMPRE PELO LINK ABAIXO:",
        footer: footer || null,
        showOriginalPrice,
        showDiscount,
        showCoupon,
        showShipping,
        isDefault,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao salvar template." },
      { status: 500 }
    );
  }
}
