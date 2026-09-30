import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, conditionField, conditionOperator, conditionValue, actionType, actionPayload } = body;

    if (!name || !conditionField || !conditionOperator || !conditionValue || !actionType) {
      return NextResponse.json(
        { success: false, error: "Todos os campos da regra são obrigatórios." },
        { status: 400 }
      );
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        conditionField,
        conditionOperator,
        conditionValue,
        actionType,
        actionPayload: typeof actionPayload === "string" ? actionPayload : JSON.stringify(actionPayload || {}),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
