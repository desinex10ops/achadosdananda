import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, status, scheduledFor, generatedText } = body;

    let updateData: any = {};

    if (action === "PUBLISH_NOW") {
      updateData.status = "PUBLISHED";
      updateData.publishedAt = new Date();

      // Atualiza também os grupos da publicação
      await prisma.publicationGroup.updateMany({
        where: { publicationId: params.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      // Atualiza oferta
      const pub = await prisma.publication.findUnique({ where: { id: params.id } });
      if (pub) {
        await prisma.offer.update({
          where: { id: pub.offerId },
          data: { status: "PUBLISHED" },
        });
      }
    } else if (action === "PAUSE") {
      updateData.status = "PAUSED";
    } else if (action === "RESUME") {
      updateData.status = "PENDING";
    } else {
      if (status) updateData.status = status;
      if (scheduledFor !== undefined) {
        updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
        updateData.status = scheduledFor ? "SCHEDULED" : "PENDING";
      }
      if (generatedText !== undefined) updateData.generatedText = generatedText;
    }

    const updated = await prisma.publication.update({
      where: { id: params.id },
      data: updateData,
      include: {
        offer: { include: { product: true, marketplace: true } },
        template: true,
        publicationGroups: { include: { group: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar item da fila:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.publication.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: "Item removido da fila com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
