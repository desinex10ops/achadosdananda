import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automation = await prisma.instagramAutomation.findUnique({
      where: { id: params.id },
      include: {
        account: true,
        conditions: true,
        actions: true,
        logs: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
        jobs: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!automation) {
      return NextResponse.json({ success: false, error: "Automação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, automation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const existing = await prisma.instagramAutomation.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Automação não encontrada" }, { status: 404 });
    }

    const { conditions, ...updateData } = body;

    // Atualização de campos simples
    const updated = await prisma.instagramAutomation.update({
      where: { id: params.id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.isActive !== undefined && { isActive: Boolean(updateData.isActive) }),
        ...(updateData.triggerType !== undefined && { triggerType: updateData.triggerType }),
        ...(updateData.targetMediaId !== undefined && { targetMediaId: updateData.targetMediaId || null }),
        ...(updateData.targetMediaUrl !== undefined && { targetMediaUrl: updateData.targetMediaUrl || null }),
        ...(updateData.matchType !== undefined && { matchType: updateData.matchType }),
        ...(updateData.keywords !== undefined && {
          keywords: typeof updateData.keywords === "string" ? updateData.keywords : JSON.stringify(updateData.keywords),
        }),
        ...(updateData.caseSensitive !== undefined && { caseSensitive: Boolean(updateData.caseSensitive) }),
        ...(updateData.ignoreAccents !== undefined && { ignoreAccents: Boolean(updateData.ignoreAccents) }),
        ...(updateData.replyInPublic !== undefined && { replyInPublic: Boolean(updateData.replyInPublic) }),
        ...(updateData.publicReplyTemplate !== undefined && { publicReplyTemplate: updateData.publicReplyTemplate }),
        ...(updateData.likeComment !== undefined && { likeComment: Boolean(updateData.likeComment) }),
        ...(updateData.sendDirectMessage !== undefined && { sendDirectMessage: Boolean(updateData.sendDirectMessage) }),
        ...(updateData.dmMessageTemplate !== undefined && { dmMessageTemplate: updateData.dmMessageTemplate }),
        ...(updateData.dmButtonText !== undefined && { dmButtonText: updateData.dmButtonText }),
        ...(updateData.dmButtonUrl !== undefined && { dmButtonUrl: updateData.dmButtonUrl }),
        ...(updateData.affiliateLinkId !== undefined && { affiliateLinkId: updateData.affiliateLinkId || null }),
        ...(updateData.customLink !== undefined && { customLink: updateData.customLink || null }),
        ...(updateData.delaySeconds !== undefined && { delaySeconds: Number(updateData.delaySeconds) }),
        ...(updateData.jitterSeconds !== undefined && { jitterSeconds: Number(updateData.jitterSeconds) }),
        ...(updateData.maxExecutionsPerUser !== undefined && { maxExecutionsPerUser: Number(updateData.maxExecutionsPerUser) }),
        ...(updateData.workingHoursOnly !== undefined && { workingHoursOnly: Boolean(updateData.workingHoursOnly) }),
        ...(updateData.tagsToAdd !== undefined && { tagsToAdd: updateData.tagsToAdd }),
      },
      include: {
        account: true,
        conditions: true,
      },
    });

    // Se condições foram fornecidas, substitui
    if (Array.isArray(conditions)) {
      await prisma.automationCondition.deleteMany({
        where: { automationId: params.id },
      });

      if (conditions.length > 0) {
        await prisma.automationCondition.createMany({
          data: conditions.map((c: { type: string; operator?: string; value: string }) => ({
            automationId: params.id,
            type: c.type,
            operator: c.operator || "EQUALS",
            value: c.value,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, automation: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.instagramAutomation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Automação removida com sucesso" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
