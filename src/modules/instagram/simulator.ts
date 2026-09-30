import { prisma } from "@/lib/prisma";
import { SimulationResult } from "./types";
import { evaluateRule } from "./rule-engine";
import { interpolateTemplate } from "./executor";
import { checkRateLimit, isWithinOperatingHours, calculateScheduledTime } from "./rate-limiter";

export interface SimulatorOptions {
  automationId: string;
  simulatedText: string;
  simulatedUsername?: string;
  simulatedMediaId?: string;
  simulatedTags?: string[];
}

/**
 * Simulador de Execução de Automação do Instagram
 * Valida passo a passo a regra sem disparar chamadas para a Meta
 */
export async function simulateAutomation(options: SimulatorOptions): Promise<SimulationResult> {
  const steps: SimulationResult["steps"] = [];
  const username = options.simulatedUsername || "usuario_teste";
  const userTags = (options.simulatedTags || []).map((t) => t.toLowerCase());

  // 1. Busca Automação
  const automation = await prisma.instagramAutomation.findUnique({
    where: { id: options.automationId },
    include: {
      account: true,
      conditions: true,
    },
  });

  if (!automation) {
    return {
      success: false,
      steps: [
        {
          step: "Carga da Automação",
          status: "FAILED",
          details: `Automação com ID ${options.automationId} não foi encontrada no banco de dados.`,
        },
      ],
      preview: {},
      error: "Automação não encontrada",
    };
  }

  steps.push({
    step: "1. Inicialização da Simulação",
    status: "SUCCESS",
    details: `Automação "${automation.name}" carregada. Status: ${automation.isActive ? "Ativa" : "Inativa"}. Gatilho: ${automation.triggerType}.`,
    data: {
      automationId: automation.id,
      name: automation.name,
      isActive: automation.isActive,
      triggerType: automation.triggerType,
    },
  });

  // 2. Normalização do Evento Simulado
  const simulatedEvent = {
    accountId: automation.accountId,
    source: "simulation" as const,
    eventType: "COMMENT" as const,
    mediaId: options.simulatedMediaId || automation.targetMediaId || "media_mock_12345",
    commentId: `comment_mock_${Date.now()}`,
    senderId: "simulated_user_id_999",
    senderUsername: username,
    text: options.simulatedText,
    timestamp: new Date(),
  };

  steps.push({
    step: "2. Recepção do Evento Simulado",
    status: "SUCCESS",
    details: `Evento de comentário recebido de @${username} na mídia ${simulatedEvent.mediaId}: "${options.simulatedText}"`,
    data: { simulatedEvent },
  });

  // 3. Avaliação da Regra e Palavras-Chave
  const evalResult = evaluateRule(automation, simulatedEvent, {
    userTags,
    userExecutionCountOnMedia: 0,
  });

  if (!evalResult.isMatch) {
    steps.push({
      step: "3. Avaliação de Palavras-Chave e Condições",
      status: "FAILED",
      details: `Regra rejeitada: ${evalResult.rejectionReason}`,
      data: {
        keywordsConfigured: automation.keywords,
        matchType: automation.matchType,
        input: options.simulatedText,
      },
    });

    return {
      success: false,
      steps,
      preview: {},
      error: evalResult.rejectionReason,
    };
  }

  steps.push({
    step: "3. Avaliação de Palavras-Chave e Condições",
    status: "SUCCESS",
    details: `Correspondência confirmada! Palavra-chave detectada: "${evalResult.matchedKeyword}" usando modo [${automation.matchType}].`,
    data: {
      matchedKeyword: evalResult.matchedKeyword,
      matchType: automation.matchType,
    },
  });

  // 4. Verificação de Limites e Horário de Funcionamento
  let workingHoursStatus: "SUCCESS" | "WARNING" = "SUCCESS";
  let workingHoursDetails = "Automação opera 24/7 ou horário atual é permitido.";

  if (automation.workingHoursOnly) {
    const isWorking = isWithinOperatingHours(
      automation.account.operatingHoursStart || "08:00",
      automation.account.operatingHoursEnd || "22:00",
      automation.account.timezone || "America/Sao_Paulo"
    );

    if (!isWorking) {
      workingHoursStatus = "WARNING";
      workingHoursDetails = `Alerta: o horário atual está fora da janela de atendimento (${automation.account.operatingHoursStart} às ${automation.account.operatingHoursEnd}). Em produção, a mensagem seria reagendada.`;
    } else {
      workingHoursDetails = `Dentro da janela de atendimento permitida (${automation.account.operatingHoursStart} às ${automation.account.operatingHoursEnd}).`;
    }
  }

  const rateLimitCheck = await checkRateLimit(
    automation.accountId,
    automation.account.rateLimitPerHour,
    automation.account.rateLimitPerDay
  );

  steps.push({
    step: "4. Limite de Taxa e Horário de Funcionamento",
    status: rateLimitCheck.allowed ? workingHoursStatus : "WARNING",
    details: `${workingHoursDetails} Limite da conta: ${rateLimitCheck.currentHourlyCount}/${rateLimitCheck.maxHourlyLimit} msgs nesta hora.`,
    data: {
      rateLimitAllowed: rateLimitCheck.allowed,
      hourlyCount: rateLimitCheck.currentHourlyCount,
      dailyCount: rateLimitCheck.currentDailyCount,
    },
  });

  // 5. Resolução de Links e Variáveis de Template
  let linkUrl = automation.customLink || "";
  if (!linkUrl && automation.affiliateLinkId) {
    const affLink = await prisma.affiliateLink.findUnique({
      where: { id: automation.affiliateLinkId },
    });
    if (affLink) {
      linkUrl = affLink.affiliateUrl || affLink.originalUrl;
    }
  }
  if (!linkUrl) {
    linkUrl = "https://achadosdananda.com.br/r/oferta-exemplo";
  }

  const templateVars = {
    username,
    name: username,
    link: linkUrl,
  };

  const previewPublicReply = automation.replyInPublic && automation.publicReplyTemplate
    ? interpolateTemplate(automation.publicReplyTemplate, templateVars)
    : undefined;

  const previewDm = automation.sendDirectMessage && automation.dmMessageTemplate
    ? interpolateTemplate(automation.dmMessageTemplate, templateVars)
    : undefined;

  const previewButton = automation.dmButtonText
    ? {
        text: automation.dmButtonText,
        url: automation.dmButtonUrl ? interpolateTemplate(automation.dmButtonUrl, templateVars) : linkUrl,
      }
    : undefined;

  const plannedDelay = calculateScheduledTime(automation.delaySeconds, automation.jitterSeconds);

  steps.push({
    step: "5. Ações Planejadas e Temporização Humanizada",
    status: "SUCCESS",
    details: `Ações configuradas: ${automation.likeComment ? "[Curtir Comentário] " : ""}${previewPublicReply ? "[Resposta Pública] " : ""}${previewDm ? "[Direct Message] " : ""}. Atraso calculado: ${automation.delaySeconds}s + variação jitter (execução prevista para ${plannedDelay.toLocaleTimeString("pt-BR")}).`,
    data: {
      likeComment: automation.likeComment,
      replyInPublic: automation.replyInPublic,
      sendDirectMessage: automation.sendDirectMessage,
      tagsToAdd: automation.tagsToAdd,
      scheduledTime: plannedDelay.toISOString(),
    },
  });

  // Registra no log como SIMULATION para auditoria
  await prisma.instagramLog.create({
    data: {
      accountId: automation.accountId,
      automationId: automation.id,
      eventType: "SIMULATION",
      level: "INFO",
      message: `Simulação executada com sucesso para automação "${automation.name}" com o texto "${options.simulatedText}"`,
      instagramUsername: username,
      details: JSON.stringify({
        simulatedText: options.simulatedText,
        matchedKeyword: evalResult.matchedKeyword,
        dmPreview: previewDm,
        replyPreview: previewPublicReply,
      }),
    },
  });

  return {
    success: true,
    steps,
    preview: {
      publicReply: previewPublicReply,
      dmMessage: previewDm,
      button: previewButton,
      tagsAssigned: automation.tagsToAdd ? automation.tagsToAdd.split(",").map((s) => s.trim()) : [],
    },
  };
}
