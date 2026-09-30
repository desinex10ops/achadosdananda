import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDistributionAdapter } from "@/modules/distribution/adapter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicationId, platform = "WHATSAPP" } = body;

    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        offer: {
          include: { product: true, marketplace: true },
        },
        publicationGroups: {
          include: { group: true },
        },
      },
    });

    if (!publication) {
      return NextResponse.json({ success: false, error: "Publicação não encontrada." }, { status: 404 });
    }

    const adapter = getDistributionAdapter(platform);
    const result = await adapter.distribute({
      messageText: publication.generatedText,
      imageUrl: publication.offer.product.imageUrl,
      platform,
    });

    // Registrar log no AuditLog
    await prisma.auditLog.create({
      data: {
        action: "DISPATCH_OFFER",
        module: "DISTRIBUTION",
        details: `Disparo da oferta ${publication.offer.title} via ${platform}. Sucesso: ${result.success}`,
        status: result.success ? "SUCCESS" : "ERROR",
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Erro na distribuição:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
