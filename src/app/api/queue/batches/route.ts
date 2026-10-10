import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/queue/batches
 * Lista todas as filas exclusivas criadas, com contagem de itens por status.
 */
export async function GET() {
  try {
    const batches = await prisma.queueBatch.findMany({
      include: {
        _count: {
          select: { publications: true },
        },
        publications: {
          select: { status: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const formatted = batches.map((b) => {
      const pendingCount = b.publications.filter(
        (p) => p.status === "PENDING" || p.status === "SCHEDULED"
      ).length;
      const publishedCount = b.publications.filter(
        (p) => p.status === "PUBLISHED"
      ).length;

      return {
        id: b.id,
        name: b.name,
        category: b.category,
        date: b.date,
        color: b.color,
        status: b.status,
        totalItems: b._count.publications,
        pendingCount,
        publishedCount,
        createdAt: b.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Erro ao listar filas (batches):", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar lista de filas." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/queue/batches
 * Cria uma nova fila exclusiva.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category = "Geral", date } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome da fila é obrigatório." },
        { status: 400 }
      );
    }

    const batch = await prisma.queueBatch.create({
      data: {
        name: name.trim(),
        category: category.trim() || "Geral",
        date: date ? new Date(date) : new Date(),
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, data: batch });
  } catch (error: any) {
    console.error("Erro ao criar fila:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao criar fila." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/queue/batches
 * Edita uma fila existente (nome, categoria, data).
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da fila é obrigatório." },
        { status: 400 }
      );
    }

    const updated = await prisma.queueBatch.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(category && { category: category.trim() }),
        ...(date && { date: new Date(date) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar fila:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao atualizar fila." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/queue/batches
 * Exclui uma fila e opcionalmente remove ou desassocia todas as suas publicações.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da fila é obrigatório." },
        { status: 400 }
      );
    }

    // Exclui todas as publicações vinculadas a esta fila
    await prisma.publication.deleteMany({
      where: { queueBatchId: id },
    });

    // Exclui a fila
    await prisma.queueBatch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Fila e suas publicações excluídas com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro ao excluir fila:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao excluir fila." },
      { status: 500 }
    );
  }
}
