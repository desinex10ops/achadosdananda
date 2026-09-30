import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const linkId = params.id;
    const headerList = headers();
    const userAgent = headerList.get("user-agent") || undefined;
    const ipAddress = headerList.get("x-forwarded-for") || undefined;
    const referrer = headerList.get("referer") || undefined;

    // Buscar no AffiliateLink
    const affiliateLink = await prisma.affiliateLink.findUnique({
      where: { id: linkId },
    });

    if (affiliateLink) {
      // Registrar clique
      await prisma.$transaction([
        prisma.click.create({
          data: {
            linkId: affiliateLink.id,
            ipAddress,
            userAgent,
            referrer,
          },
        }),
        prisma.affiliateLink.update({
          where: { id: affiliateLink.id },
          data: { clicksCount: { increment: 1 } },
        }),
      ]);

      return NextResponse.redirect(affiliateLink.affiliateUrl, 307);
    }

    // Se for o ID de uma Oferta diretamente
    const offer = await prisma.offer.findUnique({
      where: { id: linkId },
    });

    if (offer) {
      await prisma.click.create({
        data: {
          offerId: offer.id,
          ipAddress,
          userAgent,
          referrer,
        },
      });

      return NextResponse.redirect(offer.affiliateUrl, 307);
    }

    return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
  } catch (error: any) {
    console.error("Erro no redirecionamento do link:", error);
    return NextResponse.redirect(new URL("/", request.url), 307);
  }
}
