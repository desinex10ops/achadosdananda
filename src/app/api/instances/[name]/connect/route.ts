import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EvolutionClient } from "@/modules/distribution/evolution";

export const dynamic = "force-dynamic";

// Obter QR Code de uma instância específica
export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const instanceName = params.name;
    const client = new EvolutionClient();

    // 1. Tenta obter o QR Code da Evolution API
    try {
      const evoRes = await client.connectInstance(instanceName);
      const qrCode = evoRes?.base64 || evoRes?.qrcode?.base64 || evoRes?.code || null;

      if (qrCode) {
        await prisma.whatsAppInstance.updateMany({
          where: { name: instanceName },
          data: { qrCode, status: "CONNECTING" },
        });
        return NextResponse.json({ success: true, qrCode, data: evoRes });
      }

      return NextResponse.json({ success: true, data: evoRes });
    } catch (evoErr: any) {
      return NextResponse.json({
        success: false,
        error: `Evolution API não está acessível no momento: ${evoErr.message}. Certifique-se de iniciar o container com 'docker compose up -d'.`,
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
