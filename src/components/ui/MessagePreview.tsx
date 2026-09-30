"use client";

import React, { useState } from "react";
import { Copy, Check, Share2, Send, Edit3 } from "lucide-react";

interface MessagePreviewProps {
  message: string;
  onTextChange?: (newText: string) => void;
  editable?: boolean;
}

export function MessagePreview({
  message,
  onTextChange,
  editable = false,
}: MessagePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(message);

  React.useEffect(() => {
    setCurrentText(message);
  }, [message]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  const handleWhatsAppWeb = () => {
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(currentText)}`;
    window.open(url, "_blank");
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCurrentText(val);
    if (onTextChange) onTextChange(val);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-lg overflow-hidden">
      {/* Header bar mimicking messaging app header */}
      <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-300">
            Preview da Mensagem (WhatsApp)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              <span>{isEditing ? "Concluir" : "Editar"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppWeb}
            title="Abrir no WhatsApp Web"
            className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body with simulated WhatsApp green chat bubble */}
      <div className="p-4 bg-[#0c1317] flex justify-start">
        <div className="w-full max-w-lg rounded-2xl rounded-tl-sm bg-[#005c4b] p-4 text-emerald-50 shadow-md">
          {isEditing ? (
            <textarea
              value={currentText}
              onChange={handleChange}
              rows={10}
              className="w-full rounded-lg bg-[#004a3c] p-2 text-xs text-emerald-100 placeholder:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed select-text">
              {currentText}
            </div>
          )}
          <div className="mt-2 flex justify-end text-[10px] text-emerald-300/80">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
          </div>
        </div>
      </div>
    </div>
  );
}
