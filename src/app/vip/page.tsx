"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  CheckCircle2,
  Users,
  ShieldCheck,
  BellRing,
  Sparkles,
  Ticket,
  Truck,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Clock,
  Heart,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { PwaInstallPrompt } from "@/components/ui/PwaInstallPrompt";

export default function MobileCapturePage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(48);
  const [whatsappLink, setWhatsappLink] = useState("https://chat.whatsapp.com/sample-achados-nanda");
  const [metaPixelId, setMetaPixelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulação de atividade em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.floor(Math.random() * 8) + 45);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Carrega configurações (Pixel e Link Dinâmico)
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/public/config");
        const json = await res.json();
        if (json.success) {
          if (json.metaPixelId) setMetaPixelId(json.metaPixelId);
          if (json.vipInviteLink) setWhatsappLink(json.vipInviteLink);
        }
      } catch (err) {}
    }
    loadConfig();
  }, []);

  // Injeta o Meta Pixel se configurado
  useEffect(() => {
    if (!metaPixelId || typeof window === "undefined") return;
    try {
      /* eslint-disable */
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      (window as any).fbq("init", metaPixelId);
      (window as any).fbq("track", "PageView");
    } catch (e) {}
  }, [metaPixelId]);

  // Carrega ofertas recentes da central
  useEffect(() => {
    async function loadOffers() {
      try {
        const res = await fetch("/api/public/offers");
        const json = await res.json();
        if (json.success && json.offers) {
          setOffers(json.offers);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadOffers();
  }, []);

  const handleJoinVip = async () => {
    setLoading(true);

    // Dispara evento de conversão Lead no Meta Pixel
    if (typeof window !== "undefined" && (window as any).fbq) {
      try {
        (window as any).fbq("track", "Lead", {
          content_name: "Entrada Grupo VIP WhatsApp",
        });
      } catch (e) {}
    }

    try {
      // Captura UTMs da URL atual
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source") || "direct";
      const utmMedium = urlParams.get("utm_medium") || "bio";
      const utmCampaign = urlParams.get("utm_campaign") || "";

      // Roteador inteligente com auto-rotação
      const res = await fetch(`/api/public/vip-router?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      const targetUrl = data?.destinationUrl || whatsappLink;
      window.location.href = targetUrl;
    } catch (err) {
      window.location.href = whatsappLink;
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "É realmente 100% gratuito?",
      a: "Sim! Você não paga absolutamente nada para entrar e nem para permanecer nos grupos. As ofertas e cupons são compartilhados gratuitamente todos os dias.",
    },
    {
      q: "O grupo fica cheio de mensagens e conversas?",
      a: "Não! Os grupos são estritamente silenciosos. Apenas a Fernanda e a equipe oficial enviam os achadinhos selecionados para ninguém perder tempo.",
    },
    {
      q: "Como funcionam os links e a segurança?",
      a: "Todos os links enviados levam diretamente para os aplicativos e sites oficiais das lojas (Shopee, Amazon e Mercado Livre). Você compra com total segurança.",
    },
    {
      q: "Se eu não gostar, posso sair?",
      a: "A qualquer momento com apenas 1 toque, sem nenhum custo ou burocracia.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-rose-500 selection:text-white">
      {/* Container Mobile-First (Largura Máxima de Smartphone) */}
      <div className="w-full max-w-md bg-slate-900 border-x border-slate-800/80 min-h-screen flex flex-col pb-28 relative shadow-2xl">
        
        {/* Banner Superior com Brilho Neon */}
        <div className="relative overflow-hidden pt-8 pb-6 px-5 text-center bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-b border-slate-800/60">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-rose-500/15 blur-3xl pointer-events-none rounded-full" />
          
          {/* Avatar com Borda Gradiente Estilo Instagram Stories */}
          <div className="relative inline-block mb-3.5">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-rose-500/20">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 relative border-2 border-slate-900">
                <Image
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                  alt="Fernanda (Nanda)"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Selo Verificado */}
            <div className="absolute bottom-1 right-1 bg-sky-500 text-white p-1 rounded-full border-2 border-slate-900 shadow">
              <CheckCircle2 className="w-4 h-4 fill-white text-sky-500" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-white">Achados da Nanda</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              VIP
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3 font-medium">@achadosdananda • Curadoria Oficial</p>

          {/* Badge de Atividade em Tempo Real */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span><strong className="text-white">{onlineCount} pessoas</strong> online agora</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-semibold">18 vagas restantes</span>
          </div>
        </div>

        {/* Chamada Principal (Headline de Alto Impacto) */}
        <div className="px-5 pt-6 pb-4 text-center">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            GARIMPAGEM PROFISSIONAL DIÁRIA
          </div>
          <h2 className="text-2xl font-black text-white leading-tight mb-2.5">
            Os Maiores <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300">Bugs de Preço</span> e Cupons Secretos no seu Celular!
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Economize até <b>80%</b> na Shopee, Amazon e Mercado Livre. Alertas em tempo real antes de esgotar.
          </p>
        </div>

        {/* Botão de Ação Primário (CTA Magnético) */}
        <div className="px-5 pb-6">
          <button
            onClick={handleJoinVip}
            className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 p-4 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200 border border-emerald-400/40"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <div className="relative flex items-center justify-center gap-2.5">
              <MessageCircle className="w-6 h-6 fill-white" />
              <span>ENTRAR NO GRUPO VIP GRÁTIS</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-emerald-100/90 font-normal mt-1">
              ⚡ Acesso instantâneo pelo WhatsApp • Sem mensalidade
            </p>
          </button>
        </div>

        {/* Bento Grid: 4 Diferenciais do Grupo */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            Por que você não pode ficar de fora:
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
                <Flame className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Bugs de Preço</h4>
              <p className="text-[11px] text-slate-400 leading-snug">Erros de sistema das lojas para comprar quase de graça.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                <Ticket className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Cupons Secretos</h4>
              <p className="text-[11px] text-slate-400 leading-snug">Cupons escondidos que não aparecem na tela inicial.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-2">
                <Truck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Frete Grátis</h4>
              <p className="text-[11px] text-slate-400 leading-snug">Garimpagem focada em produtos com entrega gratuita.</p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                <VolumeX className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Grupo Silencioso</h4>
              <p className="text-[11px] text-slate-400 leading-snug">Sem conversas fiadas e sem spam. Somente promoções.</p>
            </div>
          </div>
        </div>

        {/* Vitrine: Achados do Dia (Preview do que tem no grupo) */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Achados Postados Hoje:
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              Ao Vivo
            </span>
          </div>

          <div className="space-y-2.5">
            {offers.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 flex gap-3 items-center hover:border-slate-600 transition"
              >
                <div className="relative w-16 h-16 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-700/50">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                  {item.discountPercentage > 0 && (
                    <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                      -{item.discountPercentage}%
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-rose-400">{item.marketplace}</span>
                    <span className="flex items-center gap-0.5 text-slate-500">
                      <Clock className="w-3 h-3" /> hoje
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate mb-1">
                    {item.title}
                  </h4>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold text-emerald-400">
                      R$ {Number(item.currentPrice).toFixed(2).replace(".", ",")}
                    </span>
                    {item.originalPrice > item.currentPrice && (
                      <span className="text-[10px] text-slate-500 line-through">
                        R$ {Number(item.originalPrice).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-slate-400">
              Mais de <b>40 ofertas</b> já foram enviadas hoje no grupo VIP!
            </p>
          </div>
        </div>

        {/* Prova Social: Depoimentos de Seguidoras */}
        <div className="px-5 py-4 bg-slate-900/60 border-y border-slate-800/60">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            Quem já está no VIP recomenda:
          </h3>

          <div className="space-y-2">
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">Juliana Ribeiro</span>
                <span className="text-[10px] text-amber-400">★★★★★</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed italic">
                “Nanda do céu, peguei a Air Fryer ontem com R$ 180 de desconto com o cupom que você postou! Já se pagou 10 vezes!”
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">Camila S. Oliveira</span>
                <span className="text-[10px] text-amber-400">★★★★★</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed italic">
                “Amo que o grupo é silencioso, ninguém fica mandando bom dia. Só chega promoção boa na hora certa.”
              </p>
            </div>
          </div>
        </div>

        {/* Perguntas Frequentes (FAQ) */}
        <div className="px-5 py-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Dúvidas Frequentes
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-3 text-left text-xs font-semibold text-slate-200 flex items-center justify-between gap-2"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === idx ? "rotate-180 text-rose-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-3 pb-3 text-[11px] text-slate-400 leading-relaxed border-t border-slate-700/30 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé Institucional + Links Rápidos do App */}
        <div className="px-5 py-4 text-center border-t border-slate-800/60 text-[11px] text-slate-500 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/achados"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
              <span>Ver Vitrine</span>
            </Link>
            <Link
              href="/cupons-vip"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              <span>Cupons VIP</span>
            </Link>
          </div>
          <div>
            <p className="font-medium text-slate-400 mb-1">Achados da Nanda Oficial © 2026</p>
            <p className="text-[10px]">
              Participamos de programas de afiliados para trazer as melhores ofertas verificadas.
            </p>
          </div>
        </div>

        {/* Barra Fixa no Rodapé do Celular (Sticky Footer CTA) */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 z-50 shadow-2xl">
          <button
            onClick={handleJoinVip}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>QUERO ENTRAR NO GRUPO VIP</span>
            <span className="text-[10px] bg-emerald-700/60 font-semibold px-2 py-0.5 rounded-full uppercase">
              Grátis
            </span>
          </button>
        </div>

        {/* PWA Prompt */}
        <PwaInstallPrompt />

      </div>
    </div>
  );
}
