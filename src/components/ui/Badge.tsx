import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    neutral: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status?.toUpperCase()) {
    case "PUBLISHED":
    case "PUBLICADA":
      return <Badge variant="success">🟢 Publicada</Badge>;
    case "SCHEDULED":
    case "AGENDADA":
      return <Badge variant="info">🔵 Agendada</Badge>;
    case "PENDING":
    case "PENDENTE":
    case "QUEUED":
      return <Badge variant="warning">🟡 Pendente na Fila</Badge>;
    case "PAUSED":
    case "PAUSADA":
      return <Badge variant="neutral">⚪ Pausada</Badge>;
    case "ERROR":
    case "ERRO":
      return <Badge variant="danger">🔴 Erro</Badge>;
    case "RADAR":
      return <Badge variant="purple">🔥 Radar</Badge>;
    case "DRAFT":
      return <Badge variant="default">📝 Rascunho</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
