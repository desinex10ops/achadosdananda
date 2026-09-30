import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await prisma.user.findFirst();
    return NextResponse.json({
      success: true,
      valido: true,
      userId: admin?.id || "admin",
      userName: admin?.name || "Fernanda (Nanda)",
      email: admin?.email || "nanda@achadosdananda.com.br",
      plan: "VIP",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
