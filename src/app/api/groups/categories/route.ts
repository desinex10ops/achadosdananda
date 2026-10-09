import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.groupCategory.findMany({
      include: {
        _count: {
          select: { groups: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome do nicho é obrigatório." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await prisma.groupCategory.upsert({
      where: { name: cleanName },
      update: {
        description: description?.trim() || null,
      },
      create: {
        name: cleanName,
        slug: slug || `nicho-${Date.now()}`,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
