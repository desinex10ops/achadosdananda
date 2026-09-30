"use client";

import React, { useRef, useState, useEffect } from "react";
import { Download, Copy, Check, Sparkles, X, Layers, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BannerGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    title: string;
    imageUrl: string;
    originalPrice: number;
    currentPrice: number;
    discountPercentage: number;
    marketplace?: string;
    affiliateUrl?: string;
  } | null;
}

export function BannerGeneratorModal({ isOpen, onClose, offer }: BannerGeneratorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<"story" | "square">("story");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen || !offer) return;
    renderBanner();
  }, [isOpen, offer, format]);

  const renderBanner = () => {
    const canvas = canvasRef.current;
    if (!canvas || !offer) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setGenerating(true);

    const isStory = format === "story";
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Fundo com Gradiente Sofisticado Escuro
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#090d16");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Luz de Fundo Neon (Glow)
    const glowGrad = ctx.createRadialGradient(width / 2, isStory ? 700 : 450, 50, width / 2, isStory ? 700 : 450, 550);
    glowGrad.addColorStop(0, "rgba(244, 63, 94, 0.25)");
    glowGrad.addColorStop(0.6, "rgba(244, 63, 94, 0.05)");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Header: Marca "Achados da Nanda"
    const headerY = isStory ? 160 : 110;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ ACHADOS DA NANDA ✨", width / 2, headerY);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 26px sans-serif";
    ctx.fillText("@achadosdananda • Curadoria VIP", width / 2, headerY + 45);

    // Carrega a imagem do produto com CORS
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = offer.imageUrl;

    img.onload = () => {
      // 4. Card Central do Produto
      const cardX = 90;
      const cardY = isStory ? 300 : 200;
      const cardW = width - 180;
      const cardH = isStory ? 800 : 500;
      const radius = 36;

      // Sombra do card
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      // Fundo branco do card
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.restore();

      // Desenha a imagem dentro do card com bordas arredondadas
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + 20, cardY + 20, cardW - 40, cardH - 40, radius - 10);
      ctx.clip();

      // Proporção de escala cover/contain
      const hRatio = (cardW - 40) / img.width;
      const vRatio = (cardH - 40) / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = cardX + 20 + ((cardW - 40) - img.width * ratio) / 2;
      const centerShiftY = cardY + 20 + ((cardH - 40) - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      ctx.restore();

      // 5. Badge de Loja (Mercado Livre / Shopee / Amazon)
      const storeName = (offer.marketplace || "OFERTA OFICIAL").toUpperCase();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(cardX + 35, cardY + 35, 260, 60, 30);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(storeName, cardX + 35 + 130, cardY + 35 + 38);

      // 6. Tarja de Desconto
      const discount = offer.discountPercentage > 0
        ? offer.discountPercentage
        : (offer.originalPrice > offer.currentPrice ? Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100) : 0);

      if (discount > 0) {
        ctx.fillStyle = "#e11d48";
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 240, cardY + 35, 200, 70, 35);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 34px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`-${discount}% OFF`, cardX + cardW - 140, cardY + 82);
      }

      // 7. Bloco de Preços Abaixo do Card
      const priceBlockY = isStory ? 1200 : 770;

      // Título do Produto (2 linhas se necessário)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      let shortTitle = offer.title;
      if (shortTitle.length > 55) shortTitle = shortTitle.substring(0, 52) + "...";
      ctx.fillText(shortTitle, width / 2, priceBlockY);

      // Preço "De"
      if (offer.originalPrice > offer.currentPrice) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 34px sans-serif";
        ctx.fillText(`De: ${formatCurrency(offer.originalPrice)}`, width / 2, priceBlockY + 70);

        // Linha tachada no preço antigo
        const textWidth = ctx.measureText(`De: ${formatCurrency(offer.originalPrice)}`).width;
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(width / 2 - textWidth / 2, priceBlockY + 60);
        ctx.lineTo(width / 2 + textWidth / 2, priceBlockY + 60);
        ctx.stroke();
      }

      // Preço "Por Apenas"
      ctx.fillStyle = "#10b981";
      ctx.font = "900 76px sans-serif";
      ctx.fillText(formatCurrency(offer.currentPrice), width / 2, priceBlockY + 160);

      // 8. Rodapé de Ação (CTA)
      if (isStory) {
        const ctaY = 1580;
        // Botão Estilo Sticker dos Stories
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(140, ctaY, width - 280, 110, 55);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.font = "900 36px sans-serif";
        ctx.fillText("🔗 LINK NO DIRECT / GRUPO VIP", width / 2, ctaY + 68);

        ctx.fillStyle = "#64748b";
        ctx.font = "600 28px sans-serif";
        ctx.fillText("Comente 'EU QUERO' para receber no Direct", width / 2, ctaY + 180);
      } else {
        const ctaY = 990;
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("Compre pelo link exclusivo dos Achados da Nanda", width / 2, ctaY);
      }

      setGenerating(false);
    };

    img.onerror = () => {
      setGenerating(false);
    };
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `achados-nanda-${format}-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      alert("Não foi possível copiar diretamente. Use o botão Baixar Imagem.");
    }
  };

  if (!isOpen || !offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gerador de Banner Automático</h3>
              <p className="text-xs text-slate-400">Pronto para Instagram Stories e Grupos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seletor de Formato */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <button
            onClick={() => setFormat("story")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              format === "story"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
            }`}
          >
            <span>📱 Formato Story (9:16)</span>
          </button>
          <button
            onClick={() => setFormat("square")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              format === "square"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
            }`}
          >
            <span>🖼️ Quadrado / WhatsApp (1:1)</span>
          </button>
        </div>

        {/* Prévia do Canvas */}
        <div className="flex justify-center bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 mb-4 overflow-hidden max-h-[380px]">
          <canvas
            ref={canvasRef}
            className="max-h-[350px] w-auto rounded-xl shadow-lg border border-slate-800"
          />
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            disabled={generating}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copiado!" : "Copiar Imagem"}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={generating}
            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
