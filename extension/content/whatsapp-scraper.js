// =======================================================================
// ACHADOS DA NANDA PRO - CLONADOR UNIVERSAL PARA WHATSAPP WEB (V4)
// Captura ofertas e grupos concorrentes com injeção automática de afiliados
// =======================================================================

(function () {
  'use strict';

  console.log('[Achados da Nanda PRO] Clonador do WhatsApp Web v4 ativo.');

  let affiliateTags = {
    amazon: 'achadosnanda-20',
    shopee: 'achadosdananda-20',
    mercadolivre: 'meli-achadosnanda',
    magalu: 'magalu-nanda',
  };

  // Carregar tags configuradas do storage da extensão
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

  // 3. Extrai links de um texto
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

    // Tenta capturar "Por: R$ YY" e "De: R$ XX"
    const porMatch = text.match(/(?:por|por\s*apenas|valor|por:)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
    const deMatch = text.match(/(?:de|de:)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);

    let currentPrice = 0;
    let originalPrice = 0;

    if (porMatch) {
      currentPrice = parseFloat(porMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (deMatch) {
      originalPrice = parseFloat(deMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
    }

    if (currentPrice > 0) {
      if (originalPrice === 0) originalPrice = currentPrice;
      return { currentPrice, originalPrice };
    }

    // Fallback: procura todos os valores em R$
    const priceMatches = Array.from(text.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi));
    if (priceMatches.length === 0) {
      return { currentPrice: 0, originalPrice: 0 };
    }

    const prices = priceMatches.map(m => {
      const cleaned = m[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }).filter(p => p > 0);

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

  // 6. Converte todo o texto da mensagem com links de afiliada da Nanda
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

  // 7. Filtra apenas elementos DENTRO da conversa aberta (IGNORA o menu lateral #side)
  function isInsideChat(el) {
    if (!el) return false;
    return !el.closest('#side') && !el.closest('header') && !el.closest('div[data-testid="chat-list"]');
  }

  // 8. Tenta converter imagem de produto em base64 seguro
  function findProductImage(el) {
    const row = el.closest('div[data-id]') || el.closest('.message-in, .message-out') || el.closest('.copyable-text')?.parentElement?.parentElement || el.parentElement;
    if (!row) return '';
    const img = row.querySelector('img[src*="blob:"], img[src*="http"], div[data-testid="image-thumb"] img, img');
    if (!img) return '';

    try {
      if (img.complete && img.naturalWidth > 30) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 300);
        canvas.height = Math.min(img.naturalHeight, 300);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {}

    return img.src || '';
  }

  // 9. Extrai título limpo das linhas da mensagem
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

    // Escolhe a linha com o nome do produto
    let chosen = candidateLines.length > 1 && candidateLines[0].length < candidateLines[1].length
      ? candidateLines[1]
      : candidateLines[0];

    chosen = chosen.replace(/^[🚨🔥⚡💥👇📢👀✨🛍️📦👉💛💖💅👑]+\s*/, '').trim();
    if (chosen.length > 95) chosen = chosen.substring(0, 95) + '...';
    return chosen;
  }

  // 10. Extrai todas as ofertas da conversa aberta de forma infalível
  function extractAllChatOffers() {
    // Busca todos os links que estão dentro do chat (fora de #side)
    const allLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
      const href = a.href || '';
      return isInsideChat(a) &&
        !href.includes('whatsapp.com') &&
        (href.includes('http') || href.includes('meli.la') || href.includes('shope') || href.includes('amzn'));
    });

    const seenUrls = new Set();
    const offers = [];

    allLinks.forEach((a, idx) => {
      try {
        const rawUrl = a.href || '';
        const cleanBase = rawUrl.split('?')[0];
        if (seenUrls.has(cleanBase)) return;
        seenUrls.add(cleanBase);

        // Pega o texto da mensagem inteira
        const msgBox = a.closest('.copyable-text') || a.closest('div[data-id]') || a.closest('div[data-testid="msg-container"]') || a.parentElement?.parentElement;
        const text = msgBox ? (msgBox.innerText || '') : '';

        const { currentPrice, originalPrice } = extractPricesFromText(text);
        const coupon = extractCouponFromText(text);
        const title = extractProductTitle(text);
        const imageUrl = findProductImage(a);
        const affiliateUrl = convertToAffiliateLink(rawUrl);
        const marketplace = detectMarketplace(rawUrl);
        const disc = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
        const convertedText = cloneAndConvertMessageText(text);

        offers.push({
          id: `wpp_${idx}_${Date.now()}`,
          isListing: false,
          marketplace,
          title,
          currentPrice: currentPrice || originalPrice || 0,
          originalPrice: originalPrice || currentPrice || 0,
          discountPercentage: disc,
          coupon,
          url: rawUrl,
          affiliateUrl,
          imageUrl,
          shippingInfo: 'Verificar no link',
          rawText: text,
          convertedText,
        });
      } catch (e) {
        console.error(e);
      }
    });

    return offers;
  }

  // 11. Toast visual no WhatsApp Web
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
        font-family: -apple-system, sans-serif;
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

  // 12. Injeta botões "⚡ Clonar c/ Meu Link" direto embaixo de cada link de oferta
  function injectCloneButtons() {
    const allLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
      const href = a.href || '';
      return isInsideChat(a) &&
        !href.includes('whatsapp.com') &&
        (href.includes('http') || href.includes('meli.la') || href.includes('shope') || href.includes('amzn'));
    });

    allLinks.forEach(a => {
      const container = a.closest('.copyable-text') || a.parentElement;
      if (!container || container.querySelector('.nanda-clone-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'nanda-clone-btn';
      btn.innerHTML = '⚡ Clonar c/ Meu Link';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        margin-bottom: 4px;
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
        z-index: 10;
      `;

      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const msgBox = a.closest('.copyable-text') || a.closest('div[data-id]') || a.parentElement?.parentElement;
        const text = msgBox ? (msgBox.innerText || '') : '';
        const converted = cloneAndConvertMessageText(text);

        navigator.clipboard.writeText(converted).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Mensagem copiada com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar automaticamente.`);
        });
      });

      container.appendChild(btn);
    });
  }

  // Observa novas mensagens chegando
  const observer = new MutationObserver(() => {
    injectCloneButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Scan inicial
  setTimeout(() => {
    injectCloneButtons();
  }, 1000);

  // 13. Comunicação com o Popup da Extensão
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
