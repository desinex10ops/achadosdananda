import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    const vipGroup = await prisma.group.findFirst({
      where: {
        isVipRouter: true,
        isActive: true,
        inviteLink: { not: null },
      },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({
      success: true,
      metaPixelId: settings?.metaPixelId || process.env.META_PIXEL_ID || null,
      vipGroupName: vipGroup?.name || "Grupo VIP #01",
      vipInviteLink: vipGroup?.inviteLink || "https://chat.whatsapp.com/sample-achados-nanda",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
