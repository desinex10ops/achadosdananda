import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MirrorEngine } from "@/modules/mirror/engine";

export const dynamic = "force-dynamic";

const EVOLUTION_BASE_URL =
  process.env.EVOLUTION_API_URL || "https://evolution-api-v2-3-7-k3pr.onrender.com";
const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "nanda_evolution_secret_2026";
const DEFAULT_INSTANCE =
  process.env.EVOLUTION_INSTANCE_NAME || "nanda-principal";

// Cache em memória complementar ao timestamp no banco para evitar duplicidade
const processedMessageIds = new Set<string>();

function extractMessageText(msgObj: any): string {
  const m = msgObj?.message || msgObj;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const eventType = (payload?.event || "").toLowerCase();
    if (
      eventType &&
      !eventType.includes("messages.upsert") &&
      !eventType.includes("messages_upsert")
    ) {
      return NextResponse.json({ ok: true, ignored: "not_messages_upsert" });
    }

    const instanceName = payload?.instance || DEFAULT_INSTANCE;
    const msgData = payload?.data?.key
      ? payload.data
      : payload?.data?.messages?.[0] || payload;
    const remoteJid: string = msgData?.key?.remoteJid || "";
    const messageId: string = msgData?.key?.id || "";
    const fromMe: boolean = Boolean(msgData?.key?.fromMe);
    const msgTimestampSec: number =
      Number(msgData?.messageTimestamp) || Math.floor(Date.now() / 1000);

    // Processa apenas mensagens vindas de grupos (@g.us)
    if (!remoteJid.endsWith("@g.us")) {
      return NextResponse.json({ ok: true, ignored: "not_group_message" });
    }

    if (fromMe && processedMessageIds.has(messageId)) {
      return NextResponse.json({ ok: true, ignored: "already_processed" });
    }

    const originalText = extractMessageText(msgData);
    if (!originalText || !/https?:\/\/[^\s]+/i.test(originalText)) {
      return NextResponse.json({ ok: true, ignored: "no_offer_link_in_message" });
    }

    if (messageId && processedMessageIds.has(messageId)) {
      return NextResponse.json({ ok: true, ignored: "duplicate_message_id" });
    }

    // Busca regras ativas no banco
    const activeRules = await (prisma as any).groupMirrorRule.findMany({
      where: { isActive: true },
    });

    if (!activeRules || activeRules.length === 0) {
      return NextResponse.json({ ok: true, ignored: "no_active_rules" });
    }

    // Filtra regras cujo sourceGroupId bate com o remoteJid
    const matchingRules = activeRules.filter((rule: any) => {
      if (rule.sourceGroupId && rule.sourceGroupId.trim() === remoteJid.trim()) {
        return true;
      }
      return false;
    });

    if (matchingRules.length === 0) {
      return NextResponse.json({
        ok: true,
        ignored: "group_not_monitored",
        remoteJid,
      });
    }

    if (messageId) {
      processedMessageIds.add(messageId);
    }

    // Desencurta e substitui apenas os links para as tags de afiliada da Nanda
    const { clonedText, replacedLinks } =
      await MirrorEngine.cloneMessageAsync(originalText);

    if (replacedLinks.length === 0 && matchingRules[0]?.filterOfficialOnly) {
      return NextResponse.json({
        ok: true,
        ignored: "no_supported_affiliate_links",
      });
    }

    // Verifica se a mensagem tem imagem para clonar junto
    const hasImage = Boolean(msgData?.message?.imageMessage);
    let base64Image: string | null = msgData?.message?.base64 || null;
    let mimeType =
      msgData?.message?.imageMessage?.mimetype || "image/jpeg";

    if (hasImage && !base64Image && messageId) {
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
              message: { key: { id: messageId } },
              convertToMp4: false,
            }),
          }
        );
        if (mediaResp.ok) {
          const mediaJson = await mediaResp.json();
          if (mediaJson?.base64) {
            base64Image = mediaJson.base64;
            mimeType = mediaJson.mimetype || mimeType;
          }
        }
      } catch (e) {
        console.warn("[WebhookMirror] Falha ao baixar imagem original:", e);
      }
    }

    const dispatchedTargets: string[] = [];

    for (const rule of matchingRules) {
      // Verifica se essa mensagem já foi processada pelo poller AUTO_SYNC_RULES via updatedAt
      const ruleCreatedMs = new Date(rule.createdAt).getTime();
      const ruleUpdatedMs = new Date(rule.updatedAt).getTime();
      const lastCheckpointSec =
        Math.abs(ruleUpdatedMs - ruleCreatedMs) < 1500
          ? 0
          : Math.floor(ruleUpdatedMs / 1000);

      if (lastCheckpointSec > 0 && msgTimestampSec <= lastCheckpointSec) {
        continue;
      }

      // Atualiza imediatamente o updatedAt no banco como trava contra duplicidade
      await (prisma as any).groupMirrorRule.update({
        where: { id: rule.id },
        data: {
          updatedAt: new Date(
            Math.max(Date.now(), (msgTimestampSec + 1) * 1000)
          ),
        },
      });

      let targetJid: string | null = rule.targetGroupId || null;

      if (targetJid && !targetJid.includes("@g.us")) {
        const dbGroup = await prisma.group.findUnique({
          where: { id: targetJid },
        });
        if (dbGroup?.whatsappJid) {
          targetJid = dbGroup.whatsappJid;
        }
      }

      if (!targetJid || !targetJid.includes("@g.us")) continue;
      if (targetJid === remoteJid) continue;

      const shouldSendImage =
        rule.mediaFormat !== "PREVIEW" && Boolean(base64Image);

      if (shouldSendImage && base64Image) {
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
          dispatchedTargets.push(rule.targetGroupName || targetJid);
          continue;
        }
      }

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

      if (sendTextResp.ok) {
        dispatchedTargets.push(rule.targetGroupName || targetJid);
      }
    }

    if (dispatchedTargets.length > 0) {
      try {
        await prisma.notification.create({
          data: {
            title: "⚡ Oferta Espelhada Automaticamente!",
            message: `Nova oferta de "${matchingRules[0].sourceGroupName}" foi convertida para seu link de afiliada e enviada para "${dispatchedTargets.join(", ")}".`,
            type: "SUCCESS",
            link: "/espelhamento",
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      messageId,
      replacedLinksCount: replacedLinks.length,
      dispatchedTargets,
    });
  } catch (err: any) {
    console.error("[WebhookMirror Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    webhook: "Achados da Nanda - Headless Mirror Webhook Receiver",
  });
}
