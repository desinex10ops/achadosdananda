import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.instagramAccount.findMany({
      include: {
        _count: {
          select: {
            automations: true,
            jobs: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, accounts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      instagramId,
      facebookPageId,
      accessToken,
      webhookSecret,
      rateLimitPerHour = 60,
      rateLimitPerDay = 600,
      operatingHoursStart = "08:00",
      operatingHoursEnd = "22:00",
      timezone = "America/Sao_Paulo",
    } = body;

    if (!name || !instagramId) {
      return NextResponse.json(
        { success: false, error: "Nome da conta e ID do Instagram são obrigatórios." },
        { status: 400 }
      );
    }

    const account = await prisma.instagramAccount.upsert({
      where: { instagramId },
      create: {
        name,
        instagramId,
        facebookPageId: facebookPageId || null,
        accessToken: accessToken || "mock_token_dev",
        webhookSecret: webhookSecret || null,
        rateLimitPerHour: Number(rateLimitPerHour) || 60,
        rateLimitPerDay: Number(rateLimitPerDay) || 600,
        operatingHoursStart: operatingHoursStart || "08:00",
        operatingHoursEnd: operatingHoursEnd || "22:00",
        timezone: timezone || "America/Sao_Paulo",
      },
      update: {
        name,
        facebookPageId: facebookPageId || null,
        ...(accessToken && { accessToken }),
        ...(webhookSecret && { webhookSecret }),
        rateLimitPerHour: Number(rateLimitPerHour) || 60,
        rateLimitPerDay: Number(rateLimitPerDay) || 600,
        operatingHoursStart: operatingHoursStart || "08:00",
        operatingHoursEnd: operatingHoursEnd || "22:00",
        timezone: timezone || "America/Sao_Paulo",
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
