import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MirrorEngine } from "@/modules/mirror/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceGroupName, originalText, imageUrl, executeSend = false } = body;

    if (!originalText) {
      return NextResponse.json({ success: false, error: "Texto original não fornecido." }, { status: 400 });
    }

    // 1. Processa a mensagem no modo CLONE
    const { clonedText, replacedLinks } = MirrorEngine.cloneMessage(originalText);

    // 2. Busca regras ativas para esse grupo de origem
    let matchingRules: any[] = [];
    try {
      matchingRules = await (prisma as any).groupMirrorRule.findMany({
        where: {
          isActive: true,
          ...(sourceGroupName && {
            sourceGroupName: { contains: sourceGroupName },
          }),
        },
      });
    } catch {
      // Ignora se tabela estiver vazia
    }

    return NextResponse.json({
      success: true,
      originalText,
      clonedText,
      replacedLinksCount: replacedLinks.length,
      replacedLinks,
      matchingRulesCount: matchingRules.length,
      matchingRules,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
