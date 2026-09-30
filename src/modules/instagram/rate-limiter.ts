import { prisma } from "@/lib/prisma";

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentHourlyCount: number;
  maxHourlyLimit: number;
  currentDailyCount: number;
  maxDailyLimit: number;
}

/**
 * Verifica limites de envio por hora e por dia para evitar restrições da Meta
 */
export async function checkRateLimit(
  accountId: string,
  hourlyLimit = 60,
  dailyLimit = 600
): Promise<RateLimitCheckResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Conta execuções de ações enviadas (SEND_DM, REPLY_COMMENT)
  const [hourlyCount, dailyCount] = await Promise.all([
    prisma.instagramJob.count({
      where: {
        accountId,
        status: { in: ["COMPLETED", "PROCESSING"] },
        executedAt: { gte: oneHourAgo },
      },
    }),
    prisma.instagramJob.count({
      where: {
        accountId,
        status: { in: ["COMPLETED", "PROCESSING"] },
        executedAt: { gte: oneDayAgo },
      },
    }),
  ]);

  if (hourlyCount >= hourlyLimit) {
    return {
      allowed: false,
      reason: `Limite de taxa por hora atingido (${hourlyCount}/${hourlyLimit})`,
      currentHourlyCount: hourlyCount,
      maxHourlyLimit: hourlyLimit,
      currentDailyCount: dailyCount,
      maxDailyLimit: dailyLimit,
    };
  }

  if (dailyCount >= dailyLimit) {
    return {
      allowed: false,
      reason: `Limite diário atingido (${dailyCount}/${dailyLimit})`,
      currentHourlyCount: hourlyCount,
      maxHourlyLimit: hourlyLimit,
      currentDailyCount: dailyCount,
      maxDailyLimit: dailyLimit,
    };
  }

  return {
    allowed: true,
    currentHourlyCount: hourlyCount,
    maxHourlyLimit: hourlyLimit,
    currentDailyCount: dailyCount,
    maxDailyLimit: dailyLimit,
  };
}

/**
 * Valida se o horário atual está dentro da janela de operação permitida (ex: 08:00 às 22:00)
 */
export function isWithinOperatingHours(
  startStr = "08:00",
  endStr = "22:00",
  timezone = "America/Sao_Paulo"
): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const timeParts = formatter.format(now).split(":");
    const currentMinutes = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Cruzamento de meia-noite (ex: 22:00 às 04:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch {
    return true; // Fallback permissivo se timezone for inválido
  }
}

/**
 * Calcula a data e hora do agendamento com atraso humanizado e variação (jitter) anti-detecção
 */
export function calculateScheduledTime(baseDelaySeconds = 15, jitterSeconds = 10): Date {
  const safeBase = Math.max(0, baseDelaySeconds);
  const safeJitter = Math.max(0, jitterSeconds);
  const randomJitter = Math.floor(Math.random() * (safeJitter + 1));
  const totalDelaySeconds = safeBase + randomJitter;

  return new Date(Date.now() + totalDelaySeconds * 1000);
}
