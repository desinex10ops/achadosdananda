import { IInstagramProvider, SendDMParams, ReplyCommentParams } from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Provedor Oficial Meta Instagram Graph API
 * Utiliza as APIs oficiais para Instagram Messaging e Graph API Comments
 */
export class MetaGraphInstagramProvider implements IInstagramProvider {
  private accessToken: string;
  private instagramId: string;

  constructor(accessToken: string, instagramId: string) {
    this.accessToken = accessToken;
    this.instagramId = instagramId;
  }

  async sendDirectMessage(params: SendDMParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${GRAPH_API_BASE}/me/messages`;

      let messagePayload: Record<string, unknown>;

      if (params.button && params.button.url) {
        // Envia mensagem estruturada com botão interativo (Meta Generic Template)
        messagePayload = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: params.text.slice(0, 80),
                  subtitle: params.text.length > 80 ? params.text.slice(80, 160) : undefined,
                  buttons: [
                    {
                      type: "web_url",
                      url: params.button.url,
                      title: params.button.title.slice(0, 20),
                    },
                  ],
                },
              ],
            },
          },
        };
      } else {
        // Envia mensagem de texto simples
        messagePayload = {
          text: params.text,
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          recipient: { id: params.recipientId },
          message: messagePayload,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Falha ao enviar DM`;
        return { success: false, error: errorMsg };
      }

      return { success: true, messageId: data.message_id || data.recipient_id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async replyComment(params: ReplyCommentParams): Promise<{ success: boolean; commentId?: string; error?: string }> {
    try {
      const url = `${GRAPH_API_BASE}/${params.commentId}/replies`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          message: params.text,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Falha ao responder comentário`;
        return { success: false, error: errorMsg };
      }

      return { success: true, commentId: data.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async likeComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Instagram Graph API endpoint para curtida de comentário
      const url = `${GRAPH_API_BASE}/${commentId}/likes`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}: Falha ao curtir comentário`;
        return { success: false, error: errorMsg };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async getUserProfile(userId: string): Promise<{ id: string; username?: string; name?: string } | null> {
    try {
      const url = `${GRAPH_API_BASE}/${userId}?fields=id,username,name&access_token=${this.accessToken}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        id: data.id,
        username: data.username,
        name: data.name,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Provedor Mock para Desenvolvimento, Simulações e Ambientes de Teste
 */
export class MockInstagramProvider implements IInstagramProvider {
  async sendDirectMessage(params: SendDMParams): Promise<{ success: boolean; messageId?: string }> {
    console.log(`[MOCK INSTAGRAM DM] Para: ${params.recipientId} | Texto: ${params.text}`);
    if (params.button) {
      console.log(`[MOCK INSTAGRAM DM BOTÃO] ${params.button.title} -> ${params.button.url}`);
    }
    return { success: true, messageId: `mock_msg_${Date.now()}` };
  }

  async replyComment(params: ReplyCommentParams): Promise<{ success: boolean; commentId?: string }> {
    console.log(`[MOCK INSTAGRAM RESPOSTA] Comment: ${params.commentId} | Texto: ${params.text}`);
    return { success: true, commentId: `mock_reply_${Date.now()}` };
  }

  async likeComment(commentId: string): Promise<{ success: boolean }> {
    console.log(`[MOCK INSTAGRAM CURTIDA] Comment: ${commentId}`);
    return { success: true };
  }

  async getUserProfile(userId: string): Promise<{ id: string; username?: string; name?: string } | null> {
    return {
      id: userId,
      username: `user_${userId.slice(0, 6)}`,
      name: "Seguidor Simulado",
    };
  }
}

/**
 * Fábrica de Provedor Instagram
 */
export function getInstagramProvider(
  account: { accessToken: string; instagramId: string },
  forceMock = false
): IInstagramProvider {
  if (
    forceMock ||
    !account.accessToken ||
    account.accessToken.startsWith("mock") ||
    account.accessToken === "TEST_TOKEN"
  ) {
    return new MockInstagramProvider();
  }
  return new MetaGraphInstagramProvider(account.accessToken, account.instagramId);
}
