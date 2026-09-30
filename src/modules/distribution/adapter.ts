/**
 * CAMADA DE DISTRIBUIÇÃO (Section 29)
 *
 * Separação estrita entre o MOTOR DE OFERTAS e os CANAIS DE DISTRIBUIÇÃO.
 * Não utiliza métodos não oficiais ou que violem os termos de serviço.
 * Fornece adaptadores para:
 * 1. WhatsApp Web Click-to-Chat (100% oficial e seguro)
 * 2. Webhook Oficial (Preparado para Meta Cloud API, Z-API, etc.)
 * 3. Telegram Bot & Canais
 */

export interface DistributionPayload {
  messageText: string;
  imageUrl?: string;
  targetChannelId?: string;
  targetChannelName?: string;
  platform: "WHATSAPP" | "TELEGRAM" | "WEBHOOK";
}

export interface DistributionResult {
  success: boolean;
  channelLink?: string;
  externalMessageId?: string;
  errorMessage?: string;
}

export interface DistributionAdapter {
  distribute(payload: DistributionPayload): Promise<DistributionResult>;
}

/**
 * 1. WhatsApp Web Click-to-Chat (Método Oficial Seguro)
 */
export class WhatsAppClickToChatAdapter implements DistributionAdapter {
  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    const encoded = encodeURIComponent(payload.messageText);
    const link = `https://web.whatsapp.com/send?text=${encoded}`;

    return {
      success: true,
      channelLink: link,
    };
  }
}

/**
 * 2. Webhook Oficial / Custom Gateway (Preparado para integração futura)
 */
export class WebhookDistributionAdapter implements DistributionAdapter {
  private endpointUrl?: string;
  private apiKey?: string;

  constructor(endpointUrl?: string, apiKey?: string) {
    this.endpointUrl = endpointUrl;
    this.apiKey = apiKey;
  }

  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    if (!this.endpointUrl) {
      return {
        success: false,
        errorMessage: "Webhook URL de distribuição não configurada. Configure em Configurações > Integrações.",
      };
    }

    try {
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        externalMessageId: data.id || `MSG-${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: `Falha no disparo via webhook: ${err.message}`,
      };
    }
  }
}

/**
 * 3. Telegram Channel / Bot Adapter
 */
export class TelegramDistributionAdapter implements DistributionAdapter {
  private botToken?: string;
  private chatId?: string;

  constructor(botToken?: string, chatId?: string) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async distribute(payload: DistributionPayload): Promise<DistributionResult> {
    if (!this.botToken || !this.chatId) {
      return {
        success: false,
        errorMessage: "Token do bot ou Chat ID do Telegram não configurados.",
      };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: payload.messageText,
        }),
      });

      const data = await response.json();
      return {
        success: data.ok,
        externalMessageId: data.result?.message_id ? String(data.result.message_id) : undefined,
        errorMessage: data.description,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: `Erro no Telegram: ${err.message}`,
      };
    }
  }
}

// Factory para obter o adapter apropriado
export function getDistributionAdapter(platform: "WHATSAPP" | "TELEGRAM" | "WEBHOOK"): DistributionAdapter {
  switch (platform) {
    case "TELEGRAM":
      return new TelegramDistributionAdapter();
    case "WEBHOOK":
      return new WebhookDistributionAdapter();
    case "WHATSAPP":
    default:
      return new WhatsAppClickToChatAdapter();
  }
}
