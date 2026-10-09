/**
 * ADAPTADOR EVOLUTION API (Cluster de Instâncias Headless)
 * Suporta múltiplos números/chips por nicho para escala de 200+ grupos
 * com isolamento de falha e proteção anti-bloqueio.
 */

export interface EvolutionConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultInstance?: string;
}

export interface SendMessageOptions {
  instanceName?: string;
  targetJid: string; // Ex: 120363028394839@g.us (ID oficial do grupo no WhatsApp)
  messageText: string;
  imageUrl?: string;
  delayMs?: number;
}

export class EvolutionClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultInstance: string;

  constructor(config?: EvolutionConfig) {
    this.baseUrl = (config?.baseUrl || process.env.EVOLUTION_API_URL || "http://localhost:8080").replace(/\/$/, "");
    this.apiKey = config?.apiKey || process.env.EVOLUTION_API_KEY || "nanda_evolution_secret_key";
    this.defaultInstance = config?.defaultInstance || process.env.EVOLUTION_DEFAULT_INSTANCE || "nanda-principal";
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      apikey: this.apiKey,
    };
  }

  /**
   * Envia mensagem de texto com link preview para um grupo
   */
  async sendText(options: SendMessageOptions) {
    const instance = options.instanceName || this.defaultInstance;
    const url = `${this.baseUrl}/message/sendText/${instance}`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        number: options.targetJid,
        text: options.messageText,
        delay: options.delayMs || 1500,
        linkPreview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Evolution API] Falha no envio de texto: ${err}`);
    }

    return await res.json();
  }

  /**
   * Envia imagem com legenda (caption) para um grupo
   */
  async sendMedia(options: SendMessageOptions) {
    if (!options.imageUrl) {
      return this.sendText(options);
    }

    const instance = options.instanceName || this.defaultInstance;
    const url = `${this.baseUrl}/message/sendMedia/${instance}`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        number: options.targetJid,
        media: options.imageUrl,
        mediatype: "image",
        caption: options.messageText,
        delay: options.delayMs || 2000,
      }),
    });

    if (!res.ok) {
      // Se falhar o envio com foto, faz fallback automático para texto puro com link
      console.warn(`[Evolution API] Erro ao enviar mídia, tentando texto...`);
      return this.sendText(options);
    }

    return await res.json();
  }

  /**
   * Cria uma nova instância de WhatsApp para um nicho específico
   */
  async createInstance(instanceName: string) {
    const url = `${this.baseUrl}/instance/create`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    return await res.json();
  }

  /**
   * Obtém o QR Code ou status de conexão da instância
   */
  async connectInstance(instanceName: string) {
    const url = `${this.baseUrl}/instance/connect/${instanceName}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });

    return await res.json();
  }

  /**
   * Verifica estado da conexão (open, close, connecting)
   */
  async getConnectionState(instanceName: string) {
    const url = `${this.baseUrl}/instance/connectionState/${instanceName}`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });

    return await res.json();
  }

  /**
   * Lista todas as instâncias ativas no cluster
   */
  async listInstances() {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers(),
    });

    return await res.json();
  }
}
