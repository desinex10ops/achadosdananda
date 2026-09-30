import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      affiliateTag,
      appId,
      apiKey,
      apiSecret,
      commissionRate,
      isActive,
      defaultUrlPattern,
    } = body;

    const updated = await prisma.marketplace.update({
      where: { id: params.id },
      data: {
        ...(affiliateTag !== undefined ? { affiliateTag } : {}),
        ...(appId !== undefined ? { appId } : {}),
        ...(apiKey !== undefined ? { apiKey } : {}),
        ...(apiSecret !== undefined ? { apiSecret } : {}),
        ...(commissionRate !== undefined ? { commissionRate: parseFloat(commissionRate) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(defaultUrlPattern !== undefined ? { defaultUrlPattern } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
