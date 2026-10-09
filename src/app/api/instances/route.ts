import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EvolutionClient } from "@/modules/distribution/evolution";

export const dynamic = "force-dynamic";

// Listar todas as instâncias do banco e sincronizar status com Evolution API
export async function GET() {
  try {
    const instances = await prisma.whatsAppInstance.findMany({
      orderBy: { createdAt: "asc" },
    });

    const client = new EvolutionClient();
    
    // Tenta sincronizar status de cada instância de forma resiliente
    const syncedInstances = await Promise.all(
      instances.map(async (inst) => {
        try {
          const stateRes = await client.getConnectionState(inst.name);
          const state = stateRes?.instance?.state || stateRes?.state || inst.status;
          const mappedStatus = state === "open" ? "CONNECTED" : (state === "connecting" ? "CONNECTING" : "DISCONNECTED");
          
          if (mappedStatus !== inst.status) {
            await prisma.whatsAppInstance.update({
              where: { id: inst.id },
              data: { status: mappedStatus },
            });
            return { ...inst, status: mappedStatus };
          }
        } catch {
          // Se a Evolution API estiver offline ou a instância não criada lá ainda
        }
        return inst;
      })
    );

    return NextResponse.json({ success: true, data: syncedInstances });
  } catch (error: any) {
    console.error("Erro ao listar instâncias:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Criar nova instância por nicho
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, label, nicheSlug, phone } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nome da instância é obrigatório (ex: nanda-moda)" }, { status: 400 });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // 1. Cria ou atualiza no banco
    const instance = await prisma.whatsAppInstance.upsert({
      where: { name: cleanName },
      update: {
        label: label || `Instância ${cleanName}`,
        nicheSlug: nicheSlug || "geral",
        phone: phone || null,
      },
      create: {
        name: cleanName,
        label: label || `Instância ${cleanName}`,
        nicheSlug: nicheSlug || "geral",
        phone: phone || null,
        status: "DISCONNECTED",
      },
    });

    // 2. Tenta registrar na Evolution API
    try {
      const client = new EvolutionClient();
      await client.createInstance(cleanName);
    } catch (evoErr: any) {
      console.warn("Evolution API createInstance aviso:", evoErr.message);
    }

    return NextResponse.json({ success: true, data: instance }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar instância:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
