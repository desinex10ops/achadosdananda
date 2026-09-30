import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await prisma.user.findFirst();
    const marketplaces = await prisma.marketplace.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      valido: true,
      userId: admin?.id || "admin",
      userName: admin?.name || "Fernanda (Nanda)",
      email: admin?.email || "nanda@achadosdananda.com.br",
      plan: "PRO_VIP",
      marketplaces: marketplaces.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        affiliateTag: m.affiliateTag || "",
        defaultUrlPattern: m.defaultUrlPattern || "",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
