import { prisma } from "@/lib/prisma";

export interface ValidationResult {
  allowed: boolean;
  warnings: string[];
  errors: string[];
}

export async function validatePublicationRules(
  productId: string,
  groupId: string,
  scheduledTime: Date = new Date()
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });

  if (!group) {
    return {
      allowed: false,
      warnings: [],
      errors: ["Grupo selecionado não encontrado."],
    };
  }

  if (!group.isActive) {
    errors.push(`O grupo "${group.name}" está inativo.`);
  }

  // 1. Anti-repetição (verificar se produto já foi publicado neste grupo nas últimas 48h)
  const settings = await prisma.settings.findFirst();
  const antiRepeatHours = settings?.antiRepeatHours || 48;
  const antiRepeatThreshold = new Date(Date.now() - antiRepeatHours * 60 * 60 * 1000);

  const recentPub = await prisma.publicationGroup.findFirst({
    where: {
      groupId: groupId,
      publication: {
        offer: {
          productId: productId,
        },
        createdAt: {
          gte: antiRepeatThreshold,
        },
      },
    },
    include: {
      publication: {
        include: {
          offer: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (recentPub) {
    warnings.push(
      `Anti-repetição: O produto "${recentPub.publication.offer.product.name}" já foi adicionado/publicado neste grupo nas últimas ${antiRepeatHours}h.`
    );
  }

  // 2. Limite por hora
  const oneHourAgo = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
  const pubsLastHour = await prisma.publicationGroup.count({
    where: {
      groupId: groupId,
      createdAt: {
        gte: oneHourAgo,
        lte: scheduledTime,
      },
    },
  });

  if (pubsLastHour >= group.maxOffersPerHour) {
    warnings.push(
      `Controle de Frequência: O grupo "${group.name}" atingiu o limite de ${group.maxOffersPerHour} ofertas/hora (já existem ${pubsLastHour} no período).`
    );
  }

  // 3. Limite diário
  const startOfDay = new Date(scheduledTime);
  startOfDay.setHours(0, 0, 0, 0);

  const pubsToday = await prisma.publicationGroup.count({
    where: {
      groupId: groupId,
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  if (pubsToday >= group.maxDailyOffers) {
    warnings.push(
      `Limite diário: O grupo "${group.name}" já atingiu ${pubsToday} de ${group.maxDailyOffers} ofertas permitidas para hoje.`
    );
  }

  return {
    allowed: errors.length === 0,
    warnings,
    errors,
  };
}
