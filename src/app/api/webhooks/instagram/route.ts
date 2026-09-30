import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWebhookPayload, processEvent } from "@/modules/instagram/event-processor";
import { dispatchPendingJobs } from "@/modules/instagram/executor";

/**
 * GET: Verificação de Webhook da Meta (Instagram Graph API)
 * Meta envia hub.mode, hub.challenge e hub.verify_token
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.INSTAGRAM_VERIFY_TOKEN || "achados_nanda_secret";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Instagram Webhook] Verificação de Token Meta bem-sucedida.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Verifica se o token pertence a alguma conta específica cadastrada no banco
  if (mode === "subscribe" && token) {
    const account = await prisma.instagramAccount.findFirst({
      where: { webhookSecret: token },
    });
    if (account) {
      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: { webhookVerified: true },
      });
      console.log(`[Instagram Webhook] Conta ${account.name} verificada com token customizado.`);
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return NextResponse.json({ error: "Token de verificação inválido" }, { status: 403 });
}

/**
 * POST: Recepção de Eventos da Meta (Comentários, Menções, Mensagens)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Salva o payload bruto recebido para auditoria e rastreabilidade total
    const eventRecord = await prisma.instagramWebhookEvent.create({
      data: {
        field: body.entry?.[0]?.changes?.[0]?.field || "general",
        payload: JSON.stringify(body),
        status: "RECEIVED",
      },
    });

    // Normaliza os eventos contidos no payload
    const normalizedEvents = normalizeWebhookPayload(body);

    let totalJobs = 0;
    for (const evt of normalizedEvents) {
      const res = await processEvent(evt);
      totalJobs += res.jobsCreated;
    }

    // Atualiza status do log de webhook
    await prisma.instagramWebhookEvent.update({
      where: { id: eventRecord.id },
      data: { status: "PROCESSED" },
    });

    // Despacha em background jobs imediatos (sem aguardar para devolver 200 rápido à Meta)
    dispatchPendingJobs(5).catch((err) => {
      console.error("[Instagram Webhook] Erro ao despachar jobs imediatos:", err);
    });

    return NextResponse.json({
      status: "ok",
      eventsProcessed: normalizedEvents.length,
      jobsScheduled: totalJobs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Instagram Webhook] Erro no processamento:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
