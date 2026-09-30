// =======================================================================
// ACHADOS DA NANDA PRO - CLONADOR UNIVERSAL PARA WHATSAPP WEB (V3)
// Captura ofertas e grupos concorrentes com injeção automática de afiliados
// =======================================================================

(function () {
  'use strict';

  console.log('[Achados da Nanda PRO] Clonador do WhatsApp Web v3 ativado.');

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

    // Tenta capturar "De: R$ XX Por: R$ YY"
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

  // 7. Localiza o painel central do chat ativo (IGNORA o menu lateral #side)
  function getMainChatPane() {
    return document.querySelector('#main') ||
      document.querySelector('div[data-testid="conversation-panel-wrapper"]') ||
      document.querySelector('div[role="region"]') ||
      null;
  }

  // 8. Converte imagem para base64 para o popup conseguir exibir sem erro de CSP
  function getSafeImageSource(msgEl) {
    if (!msgEl) return '';
    const img = msgEl.querySelector('img[src*="blob:"], img[src*="http"], div[data-testid="image-thumb"] img, img');
    if (!img) return '';

    try {
      // Se for imagem pequena ou já carregada, converte via canvas
      if (img.complete && img.naturalWidth > 20 && img.naturalHeight > 20) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 320);
        canvas.height = Math.min(img.naturalHeight, 320);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      // Fallback
    }

    return img.src || '';
  }

  // 9. Extrai título limpo das linhas da mensagem
  function extractProductTitle(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    // Remove linhas com links, preços ou cabeçalhos promocionais
    const candidateLines = lines.filter(l => {
      const low = l.toLowerCase();
      if (low.startsWith('http') || low.includes('meli.la') || low.includes('shope.ee') || low.includes('amzn.to')) return false;
      if (low.includes('de:') || low.includes('por:') || low.includes('cupom:') || low.includes('compre aqui')) return false;
      if (low.includes('link:') || low.includes('r$')) return false;
      return l.length > 5;
    });

    if (candidateLines.length === 0) return 'Achado Promocional';

    // Se a primeira linha for um slogan e a segunda for o nome do produto (ex: "💛 4 Body Splash...")
    let chosen = candidateLines.length > 1 && candidateLines[0].length < candidateLines[1].length
      ? candidateLines[1]
      : candidateLines[0];

    // Limpa emojis do início
    chosen = chosen.replace(/^[🚨🔥⚡💥👇📢👀✨🛍️📦👉💛💖💅👑]+\s*/, '').trim();
    if (chosen.length > 95) chosen = chosen.substring(0, 95) + '...';
    return chosen;
  }

  // 10. Extrai dados completos de um elemento de mensagem
  function parseMessageElement(msgEl) {
    if (!msgEl) return null;

    const rawText = (msgEl.innerText || msgEl.textContent || '').trim();
    const links = extractUrlsFromText(rawText);
    const mainUrl = links.find(u => !u.includes('whatsapp.com')) || links[0] || '';
    if (!mainUrl && rawText.length < 15) return null;

    const convertedUrl = convertToAffiliateLink(mainUrl);
    const marketplace = detectMarketplace(mainUrl);
    const { currentPrice, originalPrice } = extractPricesFromText(rawText);
    const coupon = extractCouponFromText(rawText);
    const imageUrl = getSafeImageSource(msgEl);
    const title = extractProductTitle(rawText);

    const disc = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
    const convertedText = cloneAndConvertMessageText(rawText);

    return {
      id: `wpp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isListing: false,
      marketplace,
      title,
      currentPrice: currentPrice || (originalPrice || 0),
      originalPrice: originalPrice || currentPrice,
      discountPercentage: disc,
      coupon,
      url: mainUrl,
      affiliateUrl: convertedUrl,
      imageUrl,
      shippingInfo: 'Verificar no link',
      rawText,
      convertedText,
    };
  }

  // 11. Extrai todas as ofertas do chat central ativo (somente mensagens de topo com data-id)
  function extractAllChatOffers() {
    const mainPane = getMainChatPane();
    if (!mainPane) return [];

    // Busca estritamente os nós raiz de cada mensagem no chat central
    let msgNodes = Array.from(mainPane.querySelectorAll('div[data-id]'));
    if (msgNodes.length === 0) {
      msgNodes = Array.from(mainPane.querySelectorAll('div.message-in, div.message-out'));
    }
    if (msgNodes.length === 0) {
      msgNodes = Array.from(mainPane.querySelectorAll('[data-testid="msg-container"]'));
    }

    const seenUrls = new Set();
    const offers = [];

    // Itera do mais recente para o mais antigo
    for (let i = msgNodes.length - 1; i >= 0; i--) {
      const node = msgNodes[i];
      const text = node.innerText || '';

      // Verifica se contém links de compras conhecidos
      const hasOffer = /(http|meli\.la|shope\.ee|amzn\.to|mercadolivre|shopee|amazon|magalu)/i.test(text);
      if (!hasOffer) continue;

      const parsed = parseMessageElement(node);
      if (parsed && parsed.url && !seenUrls.has(parsed.url)) {
        seenUrls.add(parsed.url);
        offers.unshift(parsed); // Mantém ordem cronológica
      }
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

  // 13. Injeta botões "⚡ Clonar c/ Meu Link" estritamente nas mensagens do chat ativo (#main)
  function injectCloneButtons() {
    const mainPane = getMainChatPane();
    if (!mainPane) return;

    let messages = Array.from(mainPane.querySelectorAll('div[data-id]'));
    if (messages.length === 0) {
      messages = Array.from(mainPane.querySelectorAll('div.message-in, div.message-out'));
    }

    messages.forEach(msg => {
      if (msg.querySelector('.nanda-clone-btn')) return;

      const text = msg.innerText || '';
      const hasOffer = /(http|meli\.la|shope\.ee|amzn\.to|mercadolivre|shopee|amazon|magalu)/i.test(text);
      if (!hasOffer) return;

      const targetBox = msg.querySelector('.copyable-text') || msg;
      if (!targetBox) return;

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

        const data = parseMessageElement(msg);
        if (!data) return;

        navigator.clipboard.writeText(data.convertedText).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Mensagem copiada com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar automaticamente.`);
        });
      });

      targetBox.appendChild(btn);
    });
  }

  // Observa novas mensagens chegando apenas no chat principal
  const observer = new MutationObserver(() => {
    injectCloneButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Scan inicial
  setTimeout(() => {
    injectCloneButtons();
  }, 1000);

  // 14. Comunicação com o Popup da Extensão
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
        const mainPane = getMainChatPane();
        if (!mainPane) {
          sendResponse({
            success: false,
            error: 'Abra uma conversa ou grupo no WhatsApp Web.',
          });
        } else {
          sendResponse({
            success: false,
            error: 'Nenhuma oferta com link encontrada nesta conversa aberta.',
          });
        }
      }
      return true;
    }
    return true;
  });
})();
