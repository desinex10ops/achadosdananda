// =======================================================================
// ACHADOS DA NANDA PRO - CLONADOR UNIVERSAL PARA WHATSAPP WEB (V6)
// Com Smart Message Stitcher (fusão inteligente de foto+texto com link)
// e Injeção Automática de Códigos de Afiliada (Mercado Livre, Shopee, Amazon)
// =======================================================================

(function () {
  'use strict';

  console.log('[Achados da Nanda PRO] Clonador WhatsApp Web v6 inicializado.');

  let affiliateTags = {
    amazon: 'achadosnanda-20',
    shopee: 'achadosdananda-20',
    mercadolivre: 'meli-achadosnanda',
    magalu: 'magalu-nanda',
  };

  // Carrega tags salvas no storage da extensão
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['affiliateTags'], (res) => {
      if (res.affiliateTags) {
        affiliateTags = {
          amazon: res.affiliateTags.amazon || affiliateTags.amazon,
          shopee: res.affiliateTags.shopee || affiliateTags.shopee,
          mercadolivre: res.affiliateTags['mercado-livre'] || affiliateTags.mercadolivre,
          magalu: res.affiliateTags.magalu || affiliateTags.magalu,
        };
      }
    });
  }

  // 1. Converte links para os links de afiliada da Nanda
  function convertToAffiliateLink(url) {
    if (!url) return url;
    try {
      let clean = url.trim();
      const low = clean.toLowerCase();

      // 1. Amazon (amazon.com.br, amzn.to, a.co)
      if (low.includes('amazon') || low.includes('amzn.to') || low.includes('a.co')) {
        const tag = affiliateTags.amazon || 'achadosnanda-20';
        if (clean.includes('tag=')) {
          clean = clean.replace(/tag=[^&]+/g, `tag=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `tag=${tag}`;
        }
        return clean;
      }

      // 2. Shopee (shopee.com.br, shope.ee, s.shopee.com.br)
      if (low.includes('shopee') || low.includes('shope.ee')) {
        const tag = affiliateTags.shopee || 'achadosdananda-20';
        if (clean.includes('utm_source=')) {
          clean = clean.replace(/utm_source=[^&]+/g, `utm_source=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `utm_source=${tag}&aff_sub=${tag}`;
        }
        return clean;
      }

      // 3. Mercado Livre (mercadolivre.com.br, meli.la, mercadolibre.com)
      if (low.includes('mercadolivre') || low.includes('mercadolibre') || low.includes('meli.la')) {
        const tag = affiliateTags.mercadolivre || 'meli-achadosnanda';
        if (clean.includes('matt_tool=')) {
          clean = clean.replace(/matt_tool=[^&]+/g, `matt_tool=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `matt_tool=${tag}&tracking_id=${tag}`;
        }
        return clean;
      }

      // 4. Magalu (magazineluiza.com.br, magazinevoce.com.br, magalu.me)
      if (low.includes('magalu') || low.includes('magazineluiza') || low.includes('magazinevoce')) {
        const tag = affiliateTags.magalu || 'magalu-nanda';
        if (clean.includes('magazinevoce.com.br/')) {
          clean = clean.replace(/magazinevoce\.com\.br\/[^\/]+/i, `magazinevoce.com.br/${tag}`);
        }
        return clean;
      }

      return clean;
    } catch (e) {
      return url;
    }
  }

  // 2. Identifica o marketplace da URL
  function detectMarketplace(url) {
    if (!url) return 'Mercado Livre';
    const low = url.toLowerCase();
    if (low.includes('amazon') || low.includes('amzn.to') || low.includes('a.co')) return 'Amazon';
    if (low.includes('shopee') || low.includes('shope.ee')) return 'Shopee';
    if (low.includes('mercadolivre') || low.includes('mercadolibre') || low.includes('meli.la')) return 'Mercado Livre';
    if (low.includes('magazineluiza') || low.includes('magalu') || low.includes('magazinevoce')) return 'Magalu';
    if (low.includes('shein')) return 'Shein';
    return 'Mercado Livre';
  }

  // 3. Extrai links de compras de um texto
  function extractUrlsFromText(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+|meli\.la\/[^\s]+|shope\.ee\/[^\s]+|amzn\.to\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => {
      let clean = u.replace(/[.,;!?)\]'"]+$/, '');
      if (!clean.startsWith('http')) clean = 'https://' + clean;
      return clean;
    });
  }

  // 4. Extrai preços (De / Por) do texto
  function extractPricesFromText(text) {
    if (!text) return { currentPrice: 0, originalPrice: 0 };

    const porMatch = text.match(/(?:por|por\s*apenas|valor|por:)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
    const deMatch = text.match(/(?:de|de:)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);

    let currentPrice = porMatch ? parseFloat(porMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
    let originalPrice = deMatch ? parseFloat(deMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

    if (currentPrice > 0) {
      if (originalPrice === 0) originalPrice = currentPrice;
      return { currentPrice, originalPrice };
    }

    // Fallback: procura todos os valores com R$ no texto
    const priceMatches = Array.from(text.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi));
    if (priceMatches.length === 0) {
      return { currentPrice: 0, originalPrice: 0 };
    }

    const prices = priceMatches
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0)
      .filter(p => p > 0);

    if (prices.length === 1) {
      return { currentPrice: prices[0], originalPrice: prices[0] };
    }
    prices.sort((a, b) => b - a);
    return { originalPrice: prices[0], currentPrice: prices[prices.length - 1] };
  }

  // 5. Extrai código de cupom
  function extractCouponFromText(text) {
    if (!text) return null;
    const match = text.match(/(?:cupom|cupom\s*:|use\s*:|c[oó]digo\s*:)\s*([A-Z0-9_\-]+)/i);
    return match ? match[1].trim().toUpperCase() : null;
  }

  // 6. Converte todo o texto da mensagem com os links de afiliada da Nanda
  function cloneAndConvertMessageText(text) {
    if (!text) return '';
    const urls = extractUrlsFromText(text);
    let converted = text;
    urls.forEach(originalUrl => {
      const affiliateUrl = convertToAffiliateLink(originalUrl);
      converted = converted.replace(originalUrl, affiliateUrl);
    });
    return converted;
  }

  // 7. Extrai título limpo das linhas da mensagem
  function extractProductTitle(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const candidateLines = lines.filter(l => {
      const low = l.toLowerCase();
      if (low.startsWith('http') || low.includes('meli.la') || low.includes('shope.ee') || low.includes('amzn.to')) return false;
      if (low.includes('de:') || low.includes('por:') || low.includes('cupom:') || low.includes('compre aqui')) return false;
      if (low.includes('link:') || low.includes('r$')) return false;
      return l.length > 5;
    });

    if (candidateLines.length === 0) return 'Achado Promocional';

    let chosen = candidateLines.length > 1 && candidateLines[0].length < candidateLines[1].length
      ? candidateLines[1]
      : candidateLines[0];

    chosen = chosen.replace(/^[🚨🔥⚡💥👇📢👀✨🛍️📦👉💛💖💅👑]+\s*/, '').trim();
    if (chosen.length > 95) chosen = chosen.substring(0, 95) + '...';
    return chosen;
  }

  // 8. Tenta converter imagem de produto em base64 seguro para evitar bloqueio de blob pelo Chrome
  function getBase64Image(node) {
    if (!node) return '';
    const img = node.querySelector('img[src*="blob:"], img[src*="http"], div[data-testid="image-thumb"] img, img');
    if (!img) return '';

    try {
      if (img.complete && img.naturalWidth > 20) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 320);
        canvas.height = Math.min(img.naturalHeight, 320);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {}

    // Se falhar canvas e for blob, não retorna o blob diretamente para evitar CSP error no popup
    if (img.src && !img.src.startsWith('blob:')) {
      return img.src;
    }
    return '';
  }

  // 9. Verifica se o elemento está no chat principal (fora da lista de contatos #side)
  function isInsideChat(el) {
    if (!el) return false;
    return !el.closest('#side') && !el.closest('header') && !el.closest('div[data-testid="chat-list"]');
  }

  // 10. Coleta todos os nós de mensagem ordenados do chat central
  function getChatMsgElements() {
    // Procura nós de mensagem do WhatsApp Web
    const candidates = Array.from(document.querySelectorAll(
      'div[data-id], div[role="row"], div.message-in, div.message-out, div[data-testid="msg-container"]'
    )).filter(isInsideChat);

    const uniqueNodes = [];
    const seen = new Set();

    candidates.forEach(el => {
      const row = el.closest('div[role="row"]') || el.closest('div[data-id]') || el;
      if (!seen.has(row)) {
        seen.add(row);
        uniqueNodes.push(row);
      }
    });

    return uniqueNodes;
  }

  // 11. Extração Inteligente com Smart Message Stitcher (une foto+texto com o link da mensagem adjacente)
  function extractAllChatOffers() {
    const nodes = getChatMsgElements();
    const seenUrls = new Set();
    const offers = [];

    // Mapeia todas as mensagens com seus textos e imagens
    const msgList = nodes.map((node, index) => {
      const text = (node.innerText || '').trim();
      const urls = extractUrlsFromText(text);
      const img = getBase64Image(node);
      return { node, index, text, urls, img };
    });

    // Itera pelas mensagens procurando links
    for (let i = 0; i < msgList.length; i++) {
      const current = msgList[i];
      if (current.urls.length === 0) continue;

      const rawUrl = current.urls[0];
      const cleanBase = rawUrl.split('?')[0];
      if (seenUrls.has(cleanBase)) continue;

      let combinedText = current.text;
      let combinedImage = current.img;

      // Smart Stitcher: Se a mensagem atual não tem preço ou tem texto curto (ex: só "Compre aqui: link")
      // Procura nas mensagens imediatamente anteriores (até 2 mensagens antes)
      const currentPrices = extractPricesFromText(combinedText);
      if (currentPrices.currentPrice === 0 || combinedText.length < 50) {
        for (let back = 1; back <= 2; back++) {
          const prev = msgList[i - back];
          if (prev && prev.text && prev.urls.length === 0) {
            // A mensagem anterior tem texto rico (título, preço, cupom)
            combinedText = prev.text + '\n' + combinedText;
            if (!combinedImage && prev.img) {
              combinedImage = prev.img;
            }
            break;
          }
        }
      }

      // Se ainda não achou imagem, tenta olhar a mensagem anterior por uma foto
      if (!combinedImage && i > 0 && msgList[i - 1].img) {
        combinedImage = msgList[i - 1].img;
      }

      const { currentPrice, originalPrice } = extractPricesFromText(combinedText);
      const coupon = extractCouponFromText(combinedText);
      const title = extractProductTitle(combinedText);
      const affiliateUrl = convertToAffiliateLink(rawUrl);
      const marketplace = detectMarketplace(rawUrl);
      const disc = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
      const convertedText = cloneAndConvertMessageText(combinedText);

      seenUrls.add(cleanBase);

      offers.push({
        id: `wpp_${i}_${Date.now()}`,
        isListing: false,
        marketplace,
        title,
        currentPrice: currentPrice || originalPrice || 0,
        originalPrice: originalPrice || currentPrice || 0,
        discountPercentage: disc,
        coupon,
        url: rawUrl,
        affiliateUrl,
        imageUrl: combinedImage,
        shippingInfo: 'Verificar no link',
        rawText: combinedText,
        convertedText,
      });
    }

    return offers;
  }

  // 12. Notificação Toast visual no WhatsApp Web
  function showToast(text) {
    let toast = document.getElementById('nanda-whatsapp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nanda-whatsapp-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #18181b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(236,72,153,0.4);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 2px solid #ec4899;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = text;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 4000);
  }

  // 13. Injeta botões "⚡ Clonar c/ Meu Link" nas mensagens do chat
  function injectCloneButtons() {
    const nodes = getChatMsgElements();

    nodes.forEach(node => {
      if (node.querySelector('.nanda-clone-btn')) return;

      const text = node.innerText || '';
      const hasOffer = /(http|meli\.la|shope\.ee|amzn\.to|mercadolivre|shopee|amazon|magalu)/i.test(text);
      if (!hasOffer) return;

      const btn = document.createElement('button');
      btn.className = 'nanda-clone-btn';
      btn.innerHTML = '⚡ Clonar c/ Meu Link';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 6px 0;
        padding: 6px 14px;
        background: linear-gradient(135deg, #ec4899, #db2777);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(236,72,153,0.35);
        transition: transform 0.15s ease;
        z-index: 99;
      `;

      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Extrai todas as ofertas da conversa e pega a correspondente ou a última
        const offers = extractAllChatOffers();
        const thisUrls = extractUrlsFromText(text);
        let targetOffer = null;

        if (thisUrls.length > 0) {
          const cleanThis = thisUrls[0].split('?')[0];
          targetOffer = offers.find(o => o.url.includes(cleanThis));
        }
        if (!targetOffer && offers.length > 0) {
          targetOffer = offers[offers.length - 1];
        }

        const toCopy = targetOffer ? targetOffer.convertedText : cloneAndConvertMessageText(text);

        navigator.clipboard.writeText(toCopy).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Mensagem copiada com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar para a área de transferência.`);
        });
      });

      const container = node.querySelector('.copyable-text') || node;
      container.appendChild(btn);
    });
  }

  // 14. Botão Flutuante Superior VIP no WhatsApp Web
  function injectFloatingBar() {
    if (document.getElementById('nanda-wpp-floating-btn')) return;

    const bar = document.createElement('div');
    bar.id = 'nanda-wpp-floating-btn';
    bar.innerHTML = `
      <button id="nanda-quick-clone-btn" title="Clonar última oferta com seu link">
        ⚡ <b>Achados da Nanda PRO</b> · Capturar Ofertas do Chat
      </button>
    `;
    bar.style.cssText = `
      position: fixed;
      top: 12px;
      right: 140px;
      z-index: 99999;
      display: flex;
      align-items: center;
    `;

    const btn = bar.querySelector('#nanda-quick-clone-btn');
    btn.style.cssText = `
      background: linear-gradient(135deg, #ec4899, #db2777);
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(236, 72, 153, 0.4);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

    btn.addEventListener('click', () => {
      const offers = extractAllChatOffers();
      if (offers.length === 0) {
        showToast('⚠️ Nenhuma oferta com link identificada nesta conversa aberta.');
        return;
      }

      // Pega a oferta mais recente
      const latest = offers[offers.length - 1];
      navigator.clipboard.writeText(latest.convertedText).then(() => {
        showToast(`⚡ <b>${offers.length} Oferta(s) Encontrada(s)!</b> Última copiada c/ seu link.`);
      });
    });

    document.body.appendChild(bar);
  }

  // Observa mudanças no DOM
  const observer = new MutationObserver(() => {
    injectCloneButtons();
    injectFloatingBar();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    injectCloneButtons();
    injectFloatingBar();
  }, 1500);

  // 15. Listener para o Popup da Extensão
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT' || request.action === 'GET_HARVESTED_OFFERS') {
      const offers = extractAllChatOffers();

      if (offers && offers.length > 0) {
        sendResponse({
          success: true,
          data: offers.length === 1 ? offers[0] : {
            isListing: true,
            totalFound: offers.length,
            marketplace: 'WhatsApp Web',
            products: offers,
          },
          offers,
          marketplace: 'WhatsApp Web',
        });
      } else {
        sendResponse({
          success: false,
          error: 'Abra uma conversa com ofertas no WhatsApp Web.',
        });
      }
      return true;
    }
    return true;
  });
})();
