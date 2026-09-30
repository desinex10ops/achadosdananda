import { prisma } from "@/lib/prisma";
import { getInstagramProvider } from "./provider";
import { checkRateLimit, isWithinOperatingHours } from "./rate-limiter";
import { TemplateVariables } from "./types";

/**
 * Substitui variáveis no template de mensagem de forma segura e padronizada
 */
export function interpolateTemplate(template: string, vars: TemplateVariables): string {
  let result = template;

  const username = vars.username || "amigo(a)";
  const name = vars.name || username;
  const link = vars.link || "";
  const productName = vars.productName || "o produto";
  const price = vars.price || "";
  const coupon = vars.coupon || "";

  // Suporte a diferentes formatos: {username}, @{username}, {{username}}
  result = result.replace(/@?\{\{?username\}?\}/gi, `@${username.replace(/^@/, "")}`);
  result = result.replace(/\{\{?nome\}?\}/gi, name);
  result = result.replace(/\{\{?name\}?\}/gi, name);
  result = result.replace(/\{\{?link\}?\}/gi, link);
  result = result.replace(/\{\{?produto\}?\}/gi, productName);
  result = result.replace(/\{\{?preco\}?\}/gi, price);
  result = result.replace(/\{\{?cupom\}?\}/gi, coupon);

  return result.trim();
}

/**
 * Atribui tags ao perfil do usuário no Instagram
 */
export async function assignUserTags(instagramUserId: string, username: string | null, tagsRaw: string) {
  if (!tagsRaw) return;
  const tags = tagsRaw
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    try {
      await prisma.instagramUserTag.upsert({
        where: {
          instagramUserId_tag: {
            instagramUserId,
            tag,
          },
        },
        create: {
          instagramUserId,
          instagramUsername: username,
          tag,
        },
        update: {
          instagramUsername: username,
        },
      });
    } catch (e) {
      console.warn(`[Instagram] Falha ao adicionar tag "${tag}" para ${instagramUserId}:`, e);
    }
  }
}

/**
 * Executa um job específico da fila do Instagram
 */
export async function executeJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const job = await prisma.instagramJob.findUnique({
    where: { id: jobId },
    include: {
      account: true,
      automation: true,
    },
  });

  if (!job) {
    return { success: false, error: "Job não encontrado" };
  }

  if (job.status === "COMPLETED" || job.status === "SKIPPED") {
    return { success: true };
  }

  // Verifica horário de funcionamento se ativado na automação
  if (job.automation?.workingHoursOnly) {
    const isWorking = isWithinOperatingHours(
      job.account.operatingHoursStart || "08:00",
      job.account.operatingHoursEnd || "22:00",
      job.account.timezone || "America/Sao_Paulo"
    );

    if (!isWorking) {
      // Reagenda para a próxima hora
      const nextAttempt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.instagramJob.update({
        where: { id: job.id },
        data: {
          scheduledFor: nextAttempt,
          errorMessage: "Fora da janela de horário de funcionamento. Reagendado.",
        },
      });
      return { success: false, error: "Fora do horário de atendimento" };
    }
  }

  // Marca como PROCESSING
  await prisma.instagramJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING" },
  });

  // Validação de taxa (Rate Limit)
  const rateLimitCheck = await checkRateLimit(
    job.accountId,
    job.account.rateLimitPerHour,
    job.account.rateLimitPerDay
  );

  if (!rateLimitCheck.allowed) {
    const rescheduleTime = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.instagramJob.update({
      where: { id: job.id },
      data: {
        status: "PENDING",
        scheduledFor: rescheduleTime,
        errorMessage: `Taxa limite atingida: ${rateLimitCheck.reason}. Reagendado para daqui a 15 minutos.`,
      },
    });

    await prisma.instagramLog.create({
      data: {
        accountId: job.accountId,
        automationId: job.automationId,
        eventType: "RATE_LIMIT_HIT",
        level: "WARN",
        message: rateLimitCheck.reason || "Limite de taxa atingido",
        instagramUserId: job.targetUserId,
        instagramUsername: job.targetUsername,
      },
    });

    return { success: false, error: rateLimitCheck.reason };
  }

  const provider = getInstagramProvider(job.account);
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(job.payload);
  } catch {
    payload = { text: job.payload };
  }

  let sendResult: { success: boolean; error?: string; messageId?: string; commentId?: string } = {
    success: false,
  };

  try {
    if (job.actionType === "SEND_DM") {
      const text = String(payload.text || "");
      const button = payload.button as { title: string; url: string } | undefined;

      sendResult = await provider.sendDirectMessage({
        recipientId: job.targetUserId,
        text,
        button,
      });
    } else if (job.actionType === "REPLY_COMMENT") {
      const text = String(payload.text || "");
      const commentId = job.targetCommentId || String(payload.commentId || "");

      if (!commentId) {
        throw new Error("ID do comentário não fornecido para resposta pública");
      }

      sendResult = await provider.replyComment({
        commentId,
        text,
      });
    } else if (job.actionType === "LIKE_COMMENT") {
      const commentId = job.targetCommentId || String(payload.commentId || "");
      if (commentId) {
        sendResult = await provider.likeComment(commentId);
      } else {
        sendResult = { success: true };
      }
    }

    if (sendResult.success) {
      // Sucesso na execução
      await prisma.instagramJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          executedAt: new Date(),
          errorMessage: null,
        },
      });

      // Atualiza métricas na automação
      if (job.automationId) {
        await prisma.instagramAutomation.update({
          where: { id: job.automationId },
          data: { totalSuccess: { increment: 1 } },
        });

        // Adiciona tags configuradas ao usuário
        if (job.automation?.tagsToAdd) {
          await assignUserTags(job.targetUserId, job.targetUsername, job.automation.tagsToAdd);
        }
      }

      await prisma.instagramLog.create({
        data: {
          accountId: job.accountId,
          automationId: job.automationId,
          eventType: job.actionType === "SEND_DM" ? "DM_SENT" : "REPLY_SENT",
          level: "SUCCESS",
          message: `Ação ${job.actionType} executada com sucesso para @${job.targetUsername || job.targetUserId}`,
          instagramUserId: job.targetUserId,
          instagramUsername: job.targetUsername,
          commentId: job.targetCommentId,
          mediaId: job.targetMediaId,
          details: JSON.stringify({
            actionType: job.actionType,
            messageId: sendResult.messageId,
            commentId: sendResult.commentId,
          }),
        },
      });

      return { success: true };
    } else {
      throw new Error(sendResult.error || "Erro desconhecido ao executar ação");
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const newRetryCount = job.retryCount + 1;
    const isExceeded = newRetryCount >= job.maxRetries;

    await prisma.instagramJob.update({
      where: { id: job.id },
      data: {
        status: isExceeded ? "FAILED" : "PENDING",
        retryCount: newRetryCount,
        scheduledFor: isExceeded ? job.scheduledFor : new Date(Date.now() + 5 * 60 * 1000), // Backoff de 5 minutos
        errorMessage: errorMsg,
      },
    });

    if (isExceeded && job.automationId) {
      await prisma.instagramAutomation.update({
        where: { id: job.automationId },
        data: { totalFailed: { increment: 1 } },
      });
    }

    await prisma.instagramLog.create({
      data: {
        accountId: job.accountId,
        automationId: job.automationId,
        eventType: "ERROR",
        level: "ERROR",
        message: `Falha ao executar ${job.actionType} para @${job.targetUsername || job.targetUserId}: ${errorMsg}`,
        instagramUserId: job.targetUserId,
        instagramUsername: job.targetUsername,
        commentId: job.targetCommentId,
        mediaId: job.targetMediaId,
        details: JSON.stringify({ error: errorMsg, retryCount: newRetryCount }),
      },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Processa lote de jobs pendentes prontos para execução
 */
export async function dispatchPendingJobs(limit = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pendingJobs = await prisma.instagramJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
    },
    take: limit,
    orderBy: { scheduledFor: "asc" },
  });

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    const res = await executeJob(job.id);
    if (res.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    processed: pendingJobs.length,
    succeeded,
    failed,
  };
}
