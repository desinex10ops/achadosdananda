import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        category: true,
        _count: {
          select: {
            publicationGroups: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    const categories = await prisma.groupCategory.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: { groups, categories } });
  } catch (error: any) {
    console.error("Erro ao listar grupos:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar grupos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      categoryId,
      description,
      platform = "WHATSAPP",
      allowedHoursStart = "08:00",
      allowedHoursEnd = "22:00",
      maxOffersPerHour = 3,
      maxDailyOffers = 20,
      minIntervalMinutes = 30,
      isActive = true,
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: "Nome e categoria são obrigatórios." },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name,
        categoryId,
        description,
        platform,
        allowedHoursStart,
        allowedHoursEnd,
        maxOffersPerHour: Number(maxOffersPerHour),
        maxDailyOffers: Number(maxDailyOffers),
        minIntervalMinutes: Number(minIntervalMinutes),
        isActive: Boolean(isActive),
        inviteLink: body.inviteLink || null,
        isVipRouter: Boolean(body.isVipRouter),
        maxMembers: Number(body.maxMembers || 1000),
        currentClicks: Number(body.currentClicks || 0),
        priority: Number(body.priority || 1),
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar grupo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao salvar grupo." },
      { status: 500 }
    );
  }
}
