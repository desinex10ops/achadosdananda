"use client";

import { useEffect, useRef } from "react";

/**
 * AutopilotHeartbeat
 * Componente global que roda em segundo plano em TODAS as páginas do site.
 * 1. Aciona o despachante da fila de ofertas quando o Piloto Automático está ativo.
 * 2. Sincroniza regras de Espelhamento de Grupos (Headless Mirror) como redundância ao Webhook em tempo real.
 */
export function AutopilotHeartbeat() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    const pulse = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        // 1. Sincroniza regras ativas de Espelhamento de Grupos
        await fetch("/api/mirror/headless", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "AUTO_SYNC_RULES" }),
        }).catch(() => {});

        // 2. Verifica se o piloto automático da fila está ativado
        const isActive =
          typeof window !== "undefined" &&
          localStorage.getItem("autopilot_active") === "true";

        if (isActive) {
          const res = await fetch("/api/cron/process-queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "client_heartbeat" }),
          });
          const json = await res.json();
          if (json.success && json.processed > 0) {
            console.log(
              `[AutopilotHeartbeat] 🚀 ${json.processed} oferta(s) disparada(s) com sucesso no horário!`
            );
          }
        }
      } catch {
        // Silencioso para não poluir console em perda momentânea de conexão
      } finally {
        isRunningRef.current = false;
      }
    };

    const interval = setInterval(pulse, 45000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return null;
}
