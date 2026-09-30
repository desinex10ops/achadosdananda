import { prisma } from "@/lib/prisma";

export interface OfferEvaluationData {
  id: string;
  title: string;
  category: string;
  discountPercentage: number;
  hasCoupon: boolean;
  currentPrice: number;
  originalPrice: number;
}

export async function evaluateAutomationRules(offerData: OfferEvaluationData) {
  const activeRules = await prisma.automationRule.findMany({
    where: { isActive: true },
  });

  const executedActions: string[] = [];

  for (const rule of activeRules) {
    let matches = false;

    // Avaliação de Condição
    if (rule.conditionField === "discountPercentage") {
      const targetVal = parseFloat(rule.conditionValue);
      if (rule.conditionOperator === ">=" && offerData.discountPercentage >= targetVal) matches = true;
      if (rule.conditionOperator === ">" && offerData.discountPercentage > targetVal) matches = true;
    } else if (rule.conditionField === "category") {
      if (rule.conditionOperator === "==" && offerData.category.toLowerCase() === rule.conditionValue.toLowerCase()) {
        matches = true;
      }
    } else if (rule.conditionField === "hasCoupon") {
      const isTargetTrue = rule.conditionValue.toLowerCase() === "true" || rule.conditionValue.toLowerCase() === "sim";
      if (offerData.hasCoupon === isTargetTrue) matches = true;
    }

    if (matches) {
      executedActions.push(`Regra "${rule.name}" aplicada: ${rule.actionType}`);

      // Executar Ação da Regra
      if (rule.actionType === "SET_PRIORITY") {
        await prisma.offer.update({
          where: { id: offerData.id },
          data: { priority: 2 },
        });
      } else if (rule.actionType === "ADD_TO_QUEUE") {
        // Encontrar template e grupo padrão se ainda não estiver na fila
        const existingPub = await prisma.publication.findFirst({
          where: { offerId: offerData.id },
        });

        if (!existingPub) {
          const defaultTemplate = await prisma.template.findFirst({ where: { isDefault: true } });
          const defaultGroup = await prisma.group.findFirst({ where: { isActive: true } });

          if (defaultTemplate && defaultGroup) {
            await prisma.publication.create({
              data: {
                offerId: offerData.id,
                templateId: defaultTemplate.id,
                status: "PENDING",
                generatedText: defaultTemplate.structure
                  .replace(/{TITULO}/g, offerData.title)
                  .replace(/{PRECO_POR}/g, `R$ ${offerData.currentPrice.toFixed(2)}`),
                publicationGroups: {
                  create: {
                    groupId: defaultGroup.id,
                    status: "PENDING",
                  },
                },
              },
            });
          }
        }
      }
    }
  }

  return executedActions;
}
