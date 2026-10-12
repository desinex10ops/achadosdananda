"use client";

import { useEffect, useRef } from "react";

/**
 * AutopilotHeartbeat
 * Componente global que roda em segundo plano em TODAS as páginas do site.
 * Garante que, sempre que o usuário estiver com qualquer aba do painel aberta
 * (seja no /buscar, /queue, /groups, etc.), o despachante de ofertas seja
 * acionado pontualmente assim que o horário de uma oferta chegar.
 */
export function AutopilotHeartbeat() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    const pulse = async () => {
      if (isRunningRef.current) return;

      // Verifica se o piloto automático está ativado
      const isActive =
        typeof window !== "undefined" &&
        localStorage.getItem("autopilot_active") === "true";

      if (!isActive) return;

      isRunningRef.current = true;
      try {
        const res = await fetch("/api/cron/process-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "client_heartbeat" }),
        });
        const json = await res.json();
        if (json.success && json.processed > 0) {
          console.log(`[AutopilotHeartbeat] 🚀 ${json.processed} oferta(s) disparada(s) com sucesso no horário!`);
        }
      } catch (err) {
        // Silencioso para não poluir console em perda momentânea de conexão
      } finally {
        isRunningRef.current = false;
      }
    };

    // Pulsa a cada 60 segundos de forma leve (sem forçar reconexão ao trocar de aba)
    const interval = setInterval(pulse, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return null;
}
