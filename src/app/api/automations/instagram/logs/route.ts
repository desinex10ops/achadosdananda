import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const automationId = searchParams.get("automationId");
    const accountId = searchParams.get("accountId");
    const level = searchParams.get("level");
    const eventType = searchParams.get("eventType");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const where: Record<string, unknown> = {};
    if (automationId) where.automationId = automationId;
    if (accountId) where.accountId = accountId;
    if (level) where.level = level;
    if (eventType) where.eventType = eventType;

    const logs = await prisma.instagramLog.findMany({
      where,
      include: {
        account: { select: { name: true } },
        automation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
