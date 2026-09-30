import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const marketplaces = await prisma.marketplace.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: true,
            offers: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: marketplaces });
  } catch (error: any) {
    console.error("Erro ao buscar marketplaces:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar marketplaces." },
      { status: 500 }
    );
  }
}
