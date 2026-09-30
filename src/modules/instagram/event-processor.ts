import { prisma } from "@/lib/prisma";
import { InstagramNormalizedEvent } from "./types";
import { evaluateRule } from "./rule-engine";
import { calculateScheduledTime } from "./rate-limiter";
import { interpolateTemplate } from "./executor";

/**
 * Normaliza o payload bruto de webhook da Meta Graph API para o formato unificado interno
 */
export function normalizeWebhookPayload(payload: Record<string, unknown>): InstagramNormalizedEvent[] {
  const events: InstagramNormalizedEvent[] = [];

  const entries = (payload.entry as Array<Record<string, unknown>>) || [];

  for (const entry of entries) {
    const entryId = String(entry.id || "");

    // 1. Mudanças em Comentários (Instagram Webhook field: "comments")
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes as Array<Record<string, unknown>>) {
        if (change.field === "comments" && change.value) {
          const val = change.value as Record<string, unknown>;
          const from = (val.from as Record<string, string>) || {};
          const media = (val.media as Record<string, string>) || {};

          // Ignora comentários feitos pela própria conta conectada para evitar loops infinitos
          if (from.id === entryId) continue;

          events.push({
            accountId: entryId,
            source: "webhook",
            eventType: "COMMENT",
            mediaId: media.id || String(val.media_id || ""),
            commentId: String(val.id || ""),
            senderId: from.id || "",
            senderUsername: from.username || "",
            text: String(val.text || ""),
            timestamp: new Date((Number(val.created_time) || Date.now() / 1000) * 1000),
            rawPayload: val,
          });
        }
      }
    }

    // 2. Mensagens Diretas (Instagram Webhook field: "messages")
    if (Array.isArray(entry.messaging)) {
      for (const msgItem of entry.messaging as Array<Record<string, unknown>>) {
        const sender = (msgItem.sender as Record<string, string>) || {};
        const recipient = (msgItem.recipient as Record<string, string>) || {};
        const message = (msgItem.message as Record<string, unknown>) || {};

        if (sender.id === entryId) continue; // Ignora eco de mensagens enviadas pela própria página

        const text = String(message.text || "");
        if (text) {
          events.push({
            accountId: recipient.id || entryId,
            source: "webhook",
            eventType: "MESSAGE",
            senderId: sender.id || "",
            text,
            timestamp: new Date(Number(msgItem.timestamp) || Date.now()),
            rawPayload: msgItem,
          });
        }
      }
    }
  }

  return events;
}

/**
 * Processa um evento normalizado através das regras de automação
 */
export async function processEvent(event: InstagramNormalizedEvent): Promise<{
  matchedCount: number;
  jobsCreated: number;
  matchedAutomationIds: string[];
}> {
  // Localiza a conta do Instagram conectada
  const account = await prisma.instagramAccount.findFirst({
    where: {
      OR: [
        { instagramId: event.accountId },
        { id: event.accountId },
        { facebookPageId: event.accountId },
      ],
      isActive: true,
    },
    include: {
      automations: {
        where: { isActive: true },
        include: { conditions: true },
      },
    },
  });

  if (!account || !account.automations.length) {
    return { matchedCount: 0, jobsCreated: 0, matchedAutomationIds: [] };
  }

  // Busca tags do usuário
  const userTagsRecords = await prisma.instagramUserTag.findMany({
    where: { instagramUserId: event.senderId },
    select: { tag: true },
  });
  const userTags = userTagsRecords.map((r) => r.tag.toLowerCase());

  let jobsCreated = 0;
  const matchedAutomationIds: string[] = [];

  for (const automation of account.automations) {
    // Conta quantas vezes o usuário já acionou esta automação nesta mídia
    const userExecutionCount = await prisma.instagramJob.count({
      where: {
        accountId: account.id,
        automationId: automation.id,
        targetUserId: event.senderId,
        targetMediaId: event.mediaId || undefined,
        status: { in: ["COMPLETED", "PROCESSING", "PENDING"] },
      },
    });

    const evalResult = evaluateRule(automation, event, {
      userTags,
      userExecutionCountOnMedia: userExecutionCount,
    });

    if (!evalResult.isMatch) {
      continue;
    }

    matchedAutomationIds.push(automation.id);

    // Registra o evento de correspondência
    await prisma.instagramLog.create({
      data: {
        accountId: account.id,
        automationId: automation.id,
        eventType: "KEYWORD_MATCH",
        level: "INFO",
        message: `Palavra-chave [${evalResult.matchedKeyword}] detectada para @${event.senderUsername || event.senderId}`,
        instagramUserId: event.senderId,
        instagramUsername: event.senderUsername,
        commentId: event.commentId,
        mediaId: event.mediaId,
        details: JSON.stringify({ commentText: event.text, keyword: evalResult.matchedKeyword }),
      },
    });

    // Calcula tempo agendado (atraso humanizado + jitter)
    const scheduledFor = calculateScheduledTime(automation.delaySeconds, automation.jitterSeconds);

    // Resolve URL do link afiliado se configurado
    let linkUrl = automation.customLink || "";
    if (!linkUrl && automation.affiliateLinkId) {
      const affLink = await prisma.affiliateLink.findUnique({
        where: { id: automation.affiliateLinkId },
      });
      if (affLink) {
        linkUrl = affLink.affiliateUrl || affLink.originalUrl;
      }
    }

    // Variáveis de template
    const templateVars = {
      username: event.senderUsername || "amigo(a)",
      name: event.senderUsername || "amigo(a)",
      link: linkUrl,
    };

    // 1. Ação: Curtir Comentário
    if (automation.likeComment && event.commentId) {
      const likeKey = `${account.id}:${automation.id}:${event.commentId}:LIKE`;
      try {
        await prisma.instagramJob.upsert({
          where: { idempotencyKey: likeKey },
          create: {
            accountId: account.id,
            automationId: automation.id,
            idempotencyKey: likeKey,
            actionType: "LIKE_COMMENT",
            status: "PENDING",
            scheduledFor,
            targetUserId: event.senderId,
            targetUsername: event.senderUsername,
            targetCommentId: event.commentId,
            targetMediaId: event.mediaId,
            payload: JSON.stringify({ commentId: event.commentId }),
          },
          update: {},
        });
        jobsCreated++;
      } catch (err) {
        console.warn(`[Instagram] Chave idempotente duplicada (LIKE): ${likeKey}`, err);
      }
    }

    // 2. Ação: Resposta Pública ao Comentário
    if (automation.replyInPublic && automation.publicReplyTemplate && event.commentId) {
      const replyKey = `${account.id}:${automation.id}:${event.commentId}:REPLY`;
      const replyText = interpolateTemplate(automation.publicReplyTemplate, templateVars);

      try {
        await prisma.instagramJob.upsert({
          where: { idempotencyKey: replyKey },
          create: {
            accountId: account.id,
            automationId: automation.id,
            idempotencyKey: replyKey,
            actionType: "REPLY_COMMENT",
            status: "PENDING",
            scheduledFor,
            targetUserId: event.senderId,
            targetUsername: event.senderUsername,
            targetCommentId: event.commentId,
            targetMediaId: event.mediaId,
            payload: JSON.stringify({ text: replyText, commentId: event.commentId }),
          },
          update: {},
        });
        jobsCreated++;
      } catch (err) {
        console.warn(`[Instagram] Chave idempotente duplicada (REPLY): ${replyKey}`, err);
      }
    }

    // 3. Ação: Enviar Direct Message (DM)
    if (automation.sendDirectMessage && automation.dmMessageTemplate) {
      const dmKey = `${account.id}:${automation.id}:${event.commentId || event.senderId}:DM`;
      const dmText = interpolateTemplate(automation.dmMessageTemplate, templateVars);

      let buttonPayload: { title: string; url: string } | undefined = undefined;
      if (automation.dmButtonText && linkUrl) {
        buttonPayload = {
          title: automation.dmButtonText,
          url: automation.dmButtonUrl ? interpolateTemplate(automation.dmButtonUrl, templateVars) : linkUrl,
        };
      }

      try {
        await prisma.instagramJob.upsert({
          where: { idempotencyKey: dmKey },
          create: {
            accountId: account.id,
            automationId: automation.id,
            idempotencyKey: dmKey,
            actionType: "SEND_DM",
            status: "PENDING",
            scheduledFor,
            targetUserId: event.senderId,
            targetUsername: event.senderUsername,
            targetCommentId: event.commentId,
            targetMediaId: event.mediaId,
            payload: JSON.stringify({
              text: dmText,
              button: buttonPayload,
            }),
          },
          update: {},
        });
        jobsCreated++;
      } catch (err) {
        console.warn(`[Instagram] Chave idempotente duplicada (DM): ${dmKey}`, err);
      }
    }

    // Incrementa contador de acionamento
    await prisma.instagramAutomation.update({
      where: { id: automation.id },
      data: { totalTriggered: { increment: 1 } },
    });
  }

  return {
    matchedCount: matchedAutomationIds.length,
    jobsCreated,
    matchedAutomationIds,
  };
}
