import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    const automations = await prisma.instagramAutomation.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true, instagramId: true, isActive: true },
        },
        conditions: true,
        actions: true,
        _count: {
          select: { jobs: true, logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, automations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      accountId,
      triggerType = "COMMENT_ANY",
      targetMediaId,
      targetMediaUrl,
      matchType = "CONTAINS",
      keywords,
      caseSensitive = false,
      ignoreAccents = true,
      replyInPublic = true,
      publicReplyTemplate,
      likeComment = true,
      sendDirectMessage = true,
      dmMessageTemplate,
      dmButtonText,
      dmButtonUrl,
      affiliateLinkId,
      customLink,
      delaySeconds = 15,
      jitterSeconds = 10,
      maxExecutionsPerUser = 1,
      workingHoursOnly = false,
      tagsToAdd,
      conditions = [],
    } = body;

    if (!name || !accountId || !keywords) {
      return NextResponse.json(
        { success: false, error: "Nome, conta do Instagram e palavras-chave são obrigatórios." },
        { status: 400 }
      );
    }

    // Garante que a conta existe
    const account = await prisma.instagramAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Conta do Instagram não encontrada." }, { status: 404 });
    }

    const automation = await prisma.instagramAutomation.create({
      data: {
        name,
        accountId,
        triggerType,
        targetMediaId: targetMediaId || null,
        targetMediaUrl: targetMediaUrl || null,
        matchType,
        keywords: typeof keywords === "string" ? keywords : JSON.stringify(keywords),
        caseSensitive: Boolean(caseSensitive),
        ignoreAccents: Boolean(ignoreAccents),
        replyInPublic: Boolean(replyInPublic),
        publicReplyTemplate: publicReplyTemplate || null,
        likeComment: Boolean(likeComment),
        sendDirectMessage: Boolean(sendDirectMessage),
        dmMessageTemplate: dmMessageTemplate || "Olá @{username}! Aqui está o seu link: {link}",
        dmButtonText: dmButtonText || null,
        dmButtonUrl: dmButtonUrl || null,
        affiliateLinkId: affiliateLinkId || null,
        customLink: customLink || null,
        delaySeconds: Number(delaySeconds) || 15,
        jitterSeconds: Number(jitterSeconds) || 10,
        maxExecutionsPerUser: Number(maxExecutionsPerUser) || 1,
        workingHoursOnly: Boolean(workingHoursOnly),
        tagsToAdd: tagsToAdd || null,
        conditions: {
          create: Array.isArray(conditions)
            ? conditions.map((c: { type: string; operator?: string; value: string }) => ({
                type: c.type,
                operator: c.operator || "EQUALS",
                value: c.value,
              }))
            : [],
        },
      },
      include: {
        account: true,
        conditions: true,
      },
    });

    return NextResponse.json({ success: true, automation }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
