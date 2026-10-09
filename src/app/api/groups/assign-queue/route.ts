import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupIds } = body;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum grupo selecionado." },
        { status: 400 }
      );
    }

    // Busca todas as publicações pendentes da fila
    const pendingPublications = await prisma.publication.findMany({
      where: { status: "PENDING" },
      select: { id: true },
    });

    if (pendingPublications.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhuma oferta pendente na fila no momento." },
        { status: 400 }
      );
    }

    let createdCount = 0;
    for (const pub of pendingPublications) {
      for (const gid of groupIds) {
        const existing = await prisma.publicationGroup.findFirst({
          where: { publicationId: pub.id, groupId: gid },
        });

        if (!existing) {
          await prisma.publicationGroup.create({
            data: {
              publicationId: pub.id,
              groupId: gid,
              status: "PENDING",
            },
          });
          createdCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${groupIds.length} grupo(s) selecionado(s) vinculados a ${pendingPublications.length} ofertas pendentes!`,
      createdCount,
      publicationsCount: pendingPublications.length,
    });
  } catch (error: any) {
    console.error("Erro ao vincular grupos à fila:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
