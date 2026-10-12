import { NextResponse } from "next/server";
import { MirrorEngine } from "@/modules/mirror/engine";
import { EvolutionClient } from "@/modules/distribution/evolution";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EVOLUTION_BASE_URL =
  process.env.EVOLUTION_API_URL || "https://evolution-api-v2-3-7-k3pr.onrender.com";
const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "nanda_evolution_secret_2026";
const DEFAULT_INSTANCE =
  process.env.EVOLUTION_INSTANCE_NAME || "nanda-principal";

// Grupos conhecidos que possuem grande volume de ofertas reais armazenadas na sessão
const KNOWN_OFFER_GROUP_JIDS = new Set([
  "120363425588077327@g.us", // Promo de Rica 🛍️ #35
  "120363402581039628@g.us", // OFERTAS IMPERDÍVEIS #87
  "120363427384826701@g.us", // AchaDIN MODA & BELEZA 03 🛍💰
  "120363411159407564@g.us", // 🧢 BLCK BRASIL - CLUB VIP #59
  "120363414788461803@g.us", // FÊ ACHOU #04
]);

const KNOWN_TARGET_GROUP_JIDS = new Set([
  "120363429708443665@g.us", // PROMO MODA & BELEZA #4
  "120363431312076772@g.us", // PROMO MODA & BELEZA #5
  "120363425233664151@g.us", // PROMO TESTE
  "120363356355560254@g.us", // Achados & Pechincha 🛍️ 🛒 # 3
]);

function extractMessageText(msgObj: any): string {
  if (!msgObj?.message) return "";
  const m = msgObj.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

// Função auxiliar para disparar 1 oferta clonada (com ou sem a foto original do grupo fonte)
async function dispatchSingleClonedOffer(params: {
  instanceName: string;
  targetJid: string;
  sendWithImage: boolean;
  messageId?: string;
  clonedText: string;
  hasImage?: boolean;
}): Promise<{ success: boolean; method: string; error?: string }> {
  const { instanceName, targetJid, sendWithImage, messageId, clonedText, hasImage } =
    params;

  let base64Image: string | null = null;
  let mimeType = "image/jpeg";

  // Se a oferta original tinha foto no grupo concorrente e o usuário quer enviar com foto, baixamos via Headless API
  if (sendWithImage && hasImage && messageId) {
    try {
      const mediaResp = await fetch(
        `${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${encodeURIComponent(
          instanceName
        )}`,
        {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              key: {
                id: messageId,
              },
            },
            convertToMp4: false,
          }),
        }
      );

      if (mediaResp.ok) {
        const mediaJson = await mediaResp.json();
        if (mediaJson?.base64) {
          base64Image = mediaJson.base64;
          mimeType = mediaJson.mimetype || "image/jpeg";
        }
      }
    } catch (mediaErr) {
      console.warn(
        "[HeadlessMirror] Falha ao extrair base64 da mídia original, enviando texto:",
        mediaErr
      );
    }
  }

  // Se conseguimos a imagem original da oferta, enviamos com imagem + caption clonada
  if (base64Image) {
    const sendMediaResp = await fetch(
      `${EVOLUTION_BASE_URL}/message/sendMedia/${encodeURIComponent(
        instanceName
      )}`,
      {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: targetJid,
          mediatype: "image",
          mimetype: mimeType,
          caption: clonedText,
          media: base64Image,
        }),
      }
    );

    if (sendMediaResp.ok) {
      return { success: true, method: "IMAGE_CLONE" };
    }
  }

  // Fallback ou modo Preview: envia mensagem de texto com linkPreview ativo
  const sendTextResp = await fetch(
    `${EVOLUTION_BASE_URL}/message/sendText/${encodeURIComponent(
      instanceName
    )}`,
    {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: targetJid,
        text: clonedText,
        linkPreview: true,
      }),
    }
  );

  if (!sendTextResp.ok) {
    const errTxt = await sendTextResp.text();
    return {
      success: false,
      method: "TEXT_PREVIEW",
      error: `Erro Evolution (${sendTextResp.status}): ${errTxt.slice(0, 120)}`,
    };
  }

  return { success: true, method: "TEXT_PREVIEW" };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get("instance") || DEFAULT_INSTANCE;
    const requestedSourceJid =
      searchParams.get("sourceJid") || "120363425588077327@g.us";
    const limit = Math.min(Number(searchParams.get("limit") || "12"), 25);

    const evoClient = new EvolutionClient({
      baseUrl: EVOLUTION_BASE_URL,
      apiKey: EVOLUTION_API_KEY,
      defaultInstance: instanceName,
    });

    // 1. Verifica status da sessão Headless no Evolution
    let state = "open";
    try {
      const stateRes = await evoClient.getConnectionState(instanceName);
      state = stateRes?.instance?.state || stateRes?.state || "open";
    } catch {
      state = "open";
    }
    const isConnected = state === "open";

    // 2. Busca todos os grupos reais do WhatsApp logado no navegador oculto
    let rawGroups: any[] = [];
    try {
      const grpResp = await fetch(
        `${EVOLUTION_BASE_URL}/group/fetchAllGroups/${encodeURIComponent(
          instanceName
        )}?getParticipants=false`,
        {
          headers: { apikey: EVOLUTION_API_KEY },
          cache: "no-store",
        }
      );
      if (grpResp.ok) {
        const grpData = await grpResp.json();
        if (Array.isArray(grpData)) {
          rawGroups = grpData;
        }
      }
    } catch (e) {
      console.warn("[HeadlessMirror] Falha ao listar grupos do Evolution:", e);
    }

    const formattedGroups = rawGroups
      .map((g) => ({
        jid: g.id,
        name: g.subject || "Grupo sem nome",
        size: g.size || 0,
        isRecommendedSource: KNOWN_OFFER_GROUP_JIDS.has(g.id),
        isRecommendedTarget:
          KNOWN_TARGET_GROUP_JIDS.has(g.id) ||
          (g.subject || "").toUpperCase().includes("PROMO MODA & BELEZA") ||
          (g.subject || "").toUpperCase().includes("PROMO TESTE"),
      }))
      .sort((a, b) => {
        if (a.isRecommendedSource !== b.isRecommendedSource) {
          return a.isRecommendedSource ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    // 3. Busca as mensagens mais recentes do grupo de origem selecionado
    let rawRecords: any[] = [];
    try {
      const msgResp = await fetch(
        `${EVOLUTION_BASE_URL}/chat/findMessages/${encodeURIComponent(
          instanceName
        )}`,
        {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: requestedSourceJid,
              },
            },
            limit: 45,
          }),
          cache: "no-store",
        }
      );

      if (msgResp.ok) {
        const msgData = await msgResp.json();
        rawRecords = msgData?.messages?.records || [];
      }
    } catch (e) {
      console.warn("[HeadlessMirror] Erro ao buscar mensagens do grupo:", e);
    }

    // Filtra apenas mensagens que contenham links de ofertas (http/https)
    const offerRecords = rawRecords
      .map((rec) => {
        const text = extractMessageText(rec);
        return {
          rec,
          text,
        };
      })
      .filter(({ text }) => /https?:\/\/[^\s]+/i.test(text))
      .slice(0, limit);

    // 4. Desencurta e converte todos os links para os links de afiliada da Nanda em paralelo
    const clonedOffers = await Promise.all(
      offerRecords.map(async ({ rec, text }) => {
        const { clonedText, replacedLinks } =
          await MirrorEngine.cloneMessageAsync(text);

        // Extrai título amigável da oferta
        const lines = clonedText
          .split(/\r?\n/)
          .map((l) => l.replace(/[*_~`]/g, "").trim())
          .filter((l) => l.length > 3 && !l.startsWith("http"));
        const title = lines[0] || "Oferta Capturada no Grupo";

        return {
          messageId: rec.key?.id || "",
          remoteJid: rec.key?.remoteJid || requestedSourceJid,
          timestamp: rec.messageTimestamp || Math.floor(Date.now() / 1000),
          hasImage: Boolean(rec.message?.imageMessage),
          title,
          originalText: text,
          clonedText,
          replacedLinks,
        };
      })
    );

    return NextResponse.json({
      success: true,
      session: {
        instanceName,
        state,
        isConnected,
        browserMode: "Headless Chromium (Camuflado 24/7)",
      },
      selectedSourceJid: requestedSourceJid,
      groups: formattedGroups,
      offersCount: clonedOffers.length,
      offers: clonedOffers,
    });
  } catch (err: any) {
    console.error("[HeadlessMirror GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Erro no navegador oculto" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      instanceName = DEFAULT_INSTANCE,
      sourceJid,
      sourceGroupName,
      targetJid,
      targetGroupName,
      messageId,
      clonedText,
      hasImage = true,
      sendWithImage = true,
      offers = [],
    } = body;

    // Ação 1: Verificar status / Obter QR Code para conectar WhatsApp no navegador oculto
    if (action === "GET_QR") {
      const evoClient = new EvolutionClient({
        baseUrl: EVOLUTION_BASE_URL,
        apiKey: EVOLUTION_API_KEY,
        defaultInstance: instanceName,
      });
      const stateRes = await evoClient.getConnectionState(instanceName);
      const currentState =
        stateRes?.instance?.state || stateRes?.state || "open";
      if (currentState === "open") {
        return NextResponse.json({
          success: true,
          status: "open",
          base64: null,
        });
      }
      const qrRes = await evoClient.connectInstance(instanceName);
      return NextResponse.json({
        success: true,
        status: currentState,
        base64: qrRes?.base64 || qrRes?.qrcode?.base64 || null,
      });
    }

    // Ação 2: Enviar uma única oferta clonada para o grupo de destino escolhido
    if (action === "SEND_OFFER") {
      if (!targetJid || !clonedText) {
        return NextResponse.json(
          {
            success: false,
            error: "Selecione o grupo de destino e o texto da oferta.",
          },
          { status: 400 }
        );
      }

      const result = await dispatchSingleClonedOffer({
        instanceName,
        targetJid,
        sendWithImage,
        messageId,
        clonedText,
        hasImage,
      });

      if (result.success) {
        try {
          await prisma.notification.create({
            data: {
              title: "🕵️‍♀️ Oferta Espelhada Enviada!",
              message: `Oferta capturada de "${
                sourceGroupName || sourceJid || "Grupo Fonte"
              }" enviada com seu link de afiliada para "${
                targetGroupName || targetJid
              }".`,
              type: "SUCCESS",
              link: "/espelhamento",
            },
          });
        } catch {}
      }

      return NextResponse.json({
        success: result.success,
        method: result.method,
        error: result.error,
      });
    }

    // Ação 3: Enviar lote de ofertas clonadas para o grupo de destino
    if (action === "SEND_BATCH") {
      if (!targetJid || !Array.isArray(offers) || offers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Selecione o grupo de destino e pelo menos uma oferta.",
          },
          { status: 400 }
        );
      }

      const batchToProcess = offers.slice(0, 5);
      const results = [];
      let sentCount = 0;

      for (const item of batchToProcess) {
        const res = await dispatchSingleClonedOffer({
          instanceName,
          targetJid,
          sendWithImage,
          messageId: item.messageId,
          clonedText: item.clonedText,
          hasImage: item.hasImage,
        });
        if (res.success) sentCount++;
        results.push({ messageId: item.messageId, ...res });
        await new Promise((r) => setTimeout(r, 650));
      }

      return NextResponse.json({
        success: sentCount > 0,
        sentCount,
        totalAttempted: batchToProcess.length,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[HeadlessMirror POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Falha na operação Headless" },
      { status: 500 }
    );
  }
}
