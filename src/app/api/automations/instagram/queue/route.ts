import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchPendingJobs, executeJob } from "@/modules/instagram/executor";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const accountId = searchParams.get("accountId");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (accountId) where.accountId = accountId;

    const [jobs, stats] = await Promise.all([
      prisma.instagramJob.findMany({
        where,
        include: {
          account: { select: { name: true } },
          automation: { select: { name: true } },
        },
        orderBy: { scheduledFor: "asc" },
        take: limit,
      }),
      prisma.instagramJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      SKIPPED: 0,
    };

    for (const s of stats) {
      statusCounts[s.status] = s._count._all;
    }

    return NextResponse.json({ success: true, jobs, stats: statusCounts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "dispatch";

    if (action === "retry" && body.jobId) {
      // Re-agenda o job resetando status para PENDING
      await prisma.instagramJob.update({
        where: { id: body.jobId },
        data: {
          status: "PENDING",
          scheduledFor: new Date(),
          errorMessage: null,
        },
      });

      const res = await executeJob(body.jobId);
      return NextResponse.json({ success: true, result: res });
    }

    if (action === "dispatch") {
      const limit = Number(body.limit) || 10;
      const res = await dispatchPendingJobs(limit);
      return NextResponse.json({ success: true, dispatched: res });
    }

    return NextResponse.json({ success: false, error: "Ação não reconhecida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
