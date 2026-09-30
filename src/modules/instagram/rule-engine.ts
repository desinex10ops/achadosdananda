import { MatchType, InstagramNormalizedEvent, RuleEvaluationResult } from "./types";

/**
 * Normaliza strings removendo diacríticos (acentos) e aplicando lowercase
 */
export function normalizeText(text: string, ignoreAccents = true, caseSensitive = false): string {
  let result = text.trim();
  if (ignoreAccents) {
    result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  if (!caseSensitive) {
    result = result.toLowerCase();
  }
  return result;
}

/**
 * Converte campo de keywords (JSON string ou separado por vírgula) em array limpo
 */
export function parseKeywords(keywordsRaw: string): string[] {
  if (!keywordsRaw) return [];
  try {
    const parsed = JSON.parse(keywordsRaw);
    if (Array.isArray(parsed)) {
      return parsed.map((k) => String(k).trim()).filter(Boolean);
    }
  } catch {
    // Não é JSON, processa como separado por vírgula ou ponto-e-vírgula
  }
  return keywordsRaw
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Verifica se um texto atende aos critérios de palavra-chave
 */
export function matchKeywords(
  text: string,
  keywordsRaw: string,
  matchType: MatchType = "CONTAINS",
  caseSensitive = false,
  ignoreAccents = true
): { isMatch: boolean; matchedKeyword?: string } {
  if (matchType === "ANY") {
    return { isMatch: true, matchedKeyword: "*" };
  }

  const keywords = parseKeywords(keywordsRaw);
  if (keywords.length === 0) {
    return { isMatch: false };
  }

  const normalizedInput = normalizeText(text, ignoreAccents, caseSensitive);

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword, ignoreAccents, caseSensitive);

    if (!normalizedKeyword) continue;

    switch (matchType) {
      case "EXACT":
        if (normalizedInput === normalizedKeyword) {
          return { isMatch: true, matchedKeyword: keyword };
        }
        break;

      case "CONTAINS": {
        // Verifica se a palavra está contida como palavra inteira ou substring
        // Cria regex de limites de palavras para maior precisão (ex: "EU QUERO" não deve dar falso positivo estranho)
        const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(^|\\s|[^\\w\\d])${escaped}($|\\s|[^\\w\\d])`, "i");
        if (regex.test(normalizedInput) || normalizedInput.includes(normalizedKeyword)) {
          return { isMatch: true, matchedKeyword: keyword };
        }
        break;
      }

      case "STARTS_WITH":
        if (normalizedInput.startsWith(normalizedKeyword)) {
          return { isMatch: true, matchedKeyword: keyword };
        }
        break;

      case "REGEX": {
        try {
          const regex = new RegExp(keyword, caseSensitive ? "" : "i");
          if (regex.test(text)) {
            return { isMatch: true, matchedKeyword: keyword };
          }
        } catch {
          // Expressão regular inválida
        }
        break;
      }
    }
  }

  return { isMatch: false };
}

export interface RuleEvaluationContext {
  userTags: string[];
  userExecutionCountOnMedia: number;
}

export interface MinimalAutomation {
  id: string;
  isActive: boolean;
  triggerType: string;
  targetMediaId?: string | null;
  matchType: string;
  keywords: string;
  caseSensitive: boolean;
  ignoreAccents: boolean;
  maxExecutionsPerUser: number;
  conditions?: Array<{
    type: string;
    operator: string;
    value: string;
  }>;
}

/**
 * Avalia se um evento específico corresponde à regra de automação
 */
export function evaluateRule(
  automation: MinimalAutomation,
  event: InstagramNormalizedEvent,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  if (!automation.isActive) {
    return { isMatch: false, rejectionReason: "Automação está desativada" };
  }

  // 1. Validação de Tipo de Gatilho
  if (automation.triggerType === "COMMENT_POST" || automation.triggerType === "COMMENT_REEL" || automation.triggerType === "COMMENT_ANY") {
    if (event.eventType !== "COMMENT") {
      return { isMatch: false, rejectionReason: `Gatilho incompatível: esperado comentário, recebido ${event.eventType}` };
    }
  } else if (automation.triggerType === "DIRECT_MESSAGE") {
    if (event.eventType !== "MESSAGE") {
      return { isMatch: false, rejectionReason: `Gatilho incompatível: esperada mensagem direta, recebido ${event.eventType}` };
    }
  } else if (automation.triggerType === "STORY_REPLY") {
    if (event.eventType !== "STORY_REPLY") {
      return { isMatch: false, rejectionReason: `Gatilho incompatível: esperada resposta de story, recebido ${event.eventType}` };
    }
  }

  // 2. Validação de Mídia Alvo (Se configurado para post/reel específico)
  if (automation.targetMediaId && automation.targetMediaId.trim() !== "") {
    if (event.mediaId && event.mediaId !== automation.targetMediaId) {
      return { isMatch: false, rejectionReason: `ID da mídia (${event.mediaId}) diferente do configurado (${automation.targetMediaId})` };
    }
  }

  // 3. Validação de Frequência / Anti-repetição por usuário
  if (automation.maxExecutionsPerUser > 0 && context.userExecutionCountOnMedia >= automation.maxExecutionsPerUser) {
    return {
      isMatch: false,
      rejectionReason: `Usuário já atingiu o limite de ${automation.maxExecutionsPerUser} execuções para esta mídia`,
    };
  }

  // 4. Validação de Palavras-Chave
  const matchResult = matchKeywords(
    event.text,
    automation.keywords,
    automation.matchType as MatchType,
    automation.caseSensitive,
    automation.ignoreAccents
  );

  if (!matchResult.isMatch) {
    return { isMatch: false, rejectionReason: "Nenhuma palavra-chave correspondente encontrada no comentário/mensagem" };
  }

  // 5. Validação de Condições Adicionais
  if (automation.conditions && automation.conditions.length > 0) {
    for (const cond of automation.conditions) {
      if (cond.type === "USER_NOT_TAGGED") {
        if (context.userTags.includes(cond.value.toLowerCase())) {
          return { isMatch: false, rejectionReason: `Condição não satisfeita: usuário possui tag proibida [${cond.value}]` };
        }
      } else if (cond.type === "USER_TAGGED") {
        if (!context.userTags.includes(cond.value.toLowerCase())) {
          return { isMatch: false, rejectionReason: `Condição não satisfeita: usuário não possui tag obrigatória [${cond.value}]` };
        }
      }
    }
  }

  return {
    isMatch: true,
    matchedKeyword: matchResult.matchedKeyword,
    matchedAutomationId: automation.id,
  };
}
