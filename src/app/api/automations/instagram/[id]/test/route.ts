import { NextRequest, NextResponse } from "next/server";
import { simulateAutomation } from "@/modules/instagram/simulator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const {
      simulatedText = "EU QUERO",
      simulatedUsername = "comprador_curioso",
      simulatedMediaId,
      simulatedTags = [],
    } = body;

    const result = await simulateAutomation({
      automationId: params.id,
      simulatedText,
      simulatedUsername,
      simulatedMediaId,
      simulatedTags,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        steps: [
          {
            step: "Execução do Test Runner",
            status: "FAILED",
            details: `Erro interno no servidor: ${msg}`,
          },
        ],
        preview: {},
        error: msg,
      },
      { status: 500 }
    );
  }
}
